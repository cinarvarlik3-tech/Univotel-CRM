/**
 * Campaign send worker — processes pending campaign_leads via WhatsApp template API.
 */
import { resolveTemplateVariables } from '@/lib/campaigns/resolve-template-variables';
import {
  sendWhatsAppTemplate,
  type WhatsAppSendFailure,
} from '@/lib/campaigns/send-whatsapp-template';
import { normalizePhone, toE164 } from '@/lib/leads/normalize-phone';
import { sendManagerNotification } from '@/lib/notifications/send-manager-alert';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database';

const BATCH_SIZE = 50;
const DAILY_QUOTA_PAUSE = 950;
const BACKOFF_MS = [1000, 5000, 30000] as const;

type CampaignLeadUpdate = Database['public']['Tables']['campaign_leads']['Update'];

/**
 * Sleeps for the given milliseconds.
 * @param ms - Duration to wait.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resets orphaned sending rows stuck without sent_at.
 * @param campaignId - Campaign UUID.
 */
async function recoverOrphanedRows(campaignId: string): Promise<void> {
  const client = createServiceClient();
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  await client
    .from('campaign_leads')
    .update({ status: 'pending' })
    .eq('campaign_id', campaignId)
    .eq('status', 'sending')
    .is('sent_at', null)
    .lt('created_at', cutoff);
}

/**
 * Processes one campaign_lead row (single send attempt with retries).
 * @param campaignId - Parent campaign id.
 * @param campaignLeadId - campaign_leads.id.
 * @returns True if worker should continue, false if campaign aborted.
 */
async function processCampaignLead(
  campaignId: string,
  campaignLeadId: string,
): Promise<'continue' | 'abort' | 'quota_pause'> {
  const client = createServiceClient();

  const { data: campaign } = await client
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.status === 'cancelled' || campaign.status === 'failed') {
    return 'abort';
  }

  if ((campaign.daily_send_count ?? 0) >= DAILY_QUOTA_PAUSE) {
    await client
      .from('campaigns')
      .update({ status: 'paused', paused_at: new Date().toISOString() })
      .eq('id', campaignId);

    await sendManagerNotification({
      alertType: 'campaign_paused',
      message: `[CRM] Campaign ${campaignId} paused — daily quota reached. Resumes at midnight UTC.`,
    });
    return 'quota_pause';
  }

  const { data: cl } = await client
    .from('campaign_leads')
    .select('*, leads(*, lead_details(*))')
    .eq('id', campaignLeadId)
    .single();

  if (!cl || cl.status !== 'pending') {
    return 'continue';
  }

  if (cl.wa_message_id) {
    await client
      .from('campaign_leads')
      .update({ status: 'sent', sent_at: cl.sent_at ?? new Date().toISOString() })
      .eq('id', campaignLeadId);
    return 'continue';
  }

  await client.from('campaign_leads').update({ status: 'sending' }).eq('id', campaignLeadId);

  await sleep(campaign.send_delay_ms ?? 200);

  const lead = cl.leads as {
    lead_name: string | null;
    lead_phone: string;
    language: string | null;
    funnel_status: string;
    lead_details:
      | {
          university: string | null;
          budget_tier: string | null;
          budget_max: number | null;
          interested_hotel: string[] | null;
        }
      | {
          university: string | null;
          budget_tier: string | null;
          budget_max: number | null;
          interested_hotel: string[] | null;
        }[]
      | null;
  } | null;

  if (!lead) {
    await client
      .from('campaign_leads')
      .update({ status: 'failed', failed_reason: 'lead_not_found' })
      .eq('id', campaignLeadId);
    return 'continue';
  }

  const rawDetails = lead.lead_details;
  const details = Array.isArray(rawDetails) ? (rawDetails[0] ?? null) : (rawDetails ?? null);
  const templateVars = (campaign.template_variables ?? {}) as Record<string, string>;
  const resolved = resolveTemplateVariables(
    templateVars,
    {
      lead_name: lead.lead_name,
      lead_phone: lead.lead_phone,
      language: lead.language,
      funnel_status: lead.funnel_status,
    },
    details,
  );

  if (!resolved.ok) {
    await client
      .from('campaign_leads')
      .update({ status: 'skipped', skipped_reason: 'missing_variable' })
      .eq('id', campaignLeadId);
    return 'continue';
  }

  const normalized = normalizePhone(lead.lead_phone);
  const e164 = toE164(normalized.phone);

  if (!e164) {
    await client
      .from('campaign_leads')
      .update({ status: 'skipped', skipped_reason: 'no_phone' })
      .eq('id', campaignLeadId);
    return 'continue';
  }

  if (!campaign.template_id || !campaign.template_language) {
    await client.from('campaigns').update({ status: 'failed' }).eq('id', campaignId);
    return 'abort';
  }

  let lastError: WhatsAppSendFailure | null = null;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(BACKOFF_MS[attempt - 1]);
    }

    const result = await sendWhatsAppTemplate({
      toE164: e164,
      templateId: campaign.template_id,
      templateLanguage: campaign.template_language,
      bodyParameters: resolved.parameters,
    });

    if (result.ok) {
      const now = new Date().toISOString();
      await client
        .from('campaign_leads')
        .update({
          status: 'sent',
          sent_at: now,
          wa_message_id: result.waMessageId,
        } satisfies CampaignLeadUpdate)
        .eq('id', campaignLeadId);

      const { data: countRow } = await client
        .from('campaigns')
        .select('daily_send_count')
        .eq('id', campaignId)
        .single();
      await client
        .from('campaigns')
        .update({ daily_send_count: (countRow?.daily_send_count ?? 0) + 1 })
        .eq('id', campaignId);

      return 'continue';
    }

    lastError = result;

    if (result.code === 131049) {
      await client
        .from('campaign_leads')
        .update({ status: 'skipped', skipped_reason: 'frequency_cap' })
        .eq('id', campaignLeadId);
      return 'continue';
    }

    if (result.code === 131047) {
      await client
        .from('campaign_leads')
        .update({ status: 'failed', failed_reason: 'not_on_whatsapp' })
        .eq('id', campaignLeadId);
      return 'continue';
    }

    if (result.code === 132000) {
      await client.from('campaigns').update({ status: 'failed' }).eq('id', campaignId);
      await sendManagerNotification({
        alertType: 'campaign_failed',
        message: `[CRM] Campaign ${campaignId} failed — template error 132000 (${campaign.template_id}).`,
      });
      return 'abort';
    }

    if (result.code !== 130429 && result.code < 500) {
      break;
    }
  }

  await client
    .from('campaign_leads')
    .update({
      status: 'failed',
      failed_reason: lastError ? `${lastError.code}: ${lastError.message}` : 'send_failed',
    })
    .eq('id', campaignLeadId);

  return 'continue';
}

/**
 * Runs the campaign worker loop until no pending leads remain or campaign stops.
 * @param campaignId - Campaign UUID to process.
 */
export async function runCampaignWorker(campaignId: string): Promise<void> {
  const client = createServiceClient();

  const { data: campaign } = await client
    .from('campaigns')
    .select('status')
    .eq('id', campaignId)
    .single();

  if (!campaign || campaign.status !== 'running') {
    return;
  }

  await recoverOrphanedRows(campaignId);

  for (;;) {
    const { data: current } = await client
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (!current || current.status === 'cancelled' || current.status === 'failed') {
      return;
    }

    if (current.status === 'paused') {
      return;
    }

    const { data: batch } = await client
      .from('campaign_leads')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (!batch?.length) {
      await client.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
      return;
    }

    for (const row of batch) {
      const outcome = await processCampaignLead(campaignId, row.id);
      if (outcome === 'abort') return;
      if (outcome === 'quota_pause') return;
    }
  }
}
