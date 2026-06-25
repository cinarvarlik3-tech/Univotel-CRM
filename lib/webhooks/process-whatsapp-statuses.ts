/**
 * Meta WhatsApp message status webhooks — updates campaign_leads delivery/read timestamps.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database';
import { WhatsAppWebhookPayloadSchema } from '@/types/webhooks';
import {
  ignored,
  ok,
  partial,
  rejected,
  type WebhookOutcome,
} from '@/lib/webhooks/webhook-outcome';

type CampaignLeadUpdate = Database['public']['Tables']['campaign_leads']['Update'];

/**
 * Applies delivered/read status from Meta to campaign_leads by wa_message_id.
 * @param body - Raw parsed WhatsApp webhook payload.
 * @returns Structured webhook outcome.
 */
export async function processWhatsAppStatuses(body: unknown): Promise<WebhookOutcome> {
  const parsed = WhatsAppWebhookPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[whatsapp-statuses] invalid payload:', parsed.error.flatten());
    return rejected('schema_invalid', parsed.error.message);
  }

  const statuses = parsed.data.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];

  if (statuses.length === 0) {
    return ignored('no_statuses', 'no message statuses in payload');
  }

  const client = createServiceClient();
  let applied = 0;
  let failed = 0;

  for (const status of statuses) {
    const waMessageId = status.id;
    const state = status.status?.toLowerCase();

    if (!waMessageId || !state) continue;

    const now = new Date().toISOString();
    let updates: CampaignLeadUpdate | null = null;

    if (state === 'delivered') {
      updates = { delivered_at: now, status: 'delivered' };
    } else if (state === 'read') {
      updates = { read_at: now, delivered_at: now, status: 'read' };
    } else if (state === 'sent') {
      updates = { status: 'sent', sent_at: now };
    } else if (state === 'failed') {
      updates = { status: 'failed', failed_reason: state };
    } else {
      continue;
    }

    const { error } = await client
      .from('campaign_leads')
      .update(updates)
      .eq('wa_message_id', waMessageId);

    if (error) {
      console.error(`[whatsapp-statuses] update failed for ${waMessageId}:`, error.message);
      failed++;
    } else {
      applied++;
    }
  }

  if (failed > 0) {
    return partial('status_update_failed', `${applied} applied, ${failed} failed`);
  }
  return ok('statuses_updated', `${applied} campaign_leads status updates`);
}
