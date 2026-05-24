/**
 * Two-way label sync: CRM field changes → Chatwoot conversation labels.
 */
import { listConversationLabels, setConversationLabels } from '@/lib/chatwoot/client';
import { mergeOutboundLabels, type CrmLabelState } from '@/lib/chatwoot/label-categories';
import { getConversationIdForLead } from '@/lib/chatwoot/sync-engine';
import { logChatwootSync } from '@/lib/chatwoot/sync-log';
import { isChatwootLabelSyncEnabled } from '@/lib/env';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToManagers } from '@/lib/telegram';

/**
 * Loads CRM state and pushes full label set to Chatwoot (overwrite API).
 */
export async function pushLabelsToChatwoot(leadUuid: string): Promise<void> {
  if (!isChatwootLabelSyncEnabled()) return;

  const client = createServiceClient();

  const { data: lead, error: leadError } = await client
    .from('leads')
    .select(
      'uuid, funnel_status, student_stage, persona_type, special_state, message_from, lead_source, source_details, chatwoot_conversation_id',
    )
    .eq('uuid', leadUuid)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .maybeSingle();

  if (leadError || !lead) {
    console.warn(`[chatwoot] pushLabels: lead not found ${leadUuid}`);
    return;
  }

  const conversationId = getConversationIdForLead({
    chatwoot_conversation_id: lead.chatwoot_conversation_id,
    source_details: (lead.source_details as Record<string, unknown> | null) ?? null,
  });
  if (conversationId == null) {
    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'labels',
      status: 'skipped',
      payload: { reason: 'no_conversation' },
    });
    return;
  }

  const { data: details } = await client
    .from('lead_details')
    .select('uni_year, dorm_awaiting')
    .eq('lead_uuid', leadUuid)
    .maybeSingle();

  const crmState: CrmLabelState = {
    funnel_status: lead.funnel_status,
    student_stage: lead.student_stage,
    persona_type: lead.persona_type,
    special_state: lead.special_state,
    message_from: lead.message_from,
    lead_source: lead.lead_source,
    source_details: (lead.source_details as Record<string, unknown> | null) ?? null,
    uni_year: details?.uni_year ?? null,
    dorm_awaiting: details?.dorm_awaiting ?? [],
  };

  try {
    const currentLabels = await listConversationLabels(conversationId);
    const nextLabels = mergeOutboundLabels(currentLabels, crmState);
    await setConversationLabels(conversationId, nextLabels);

    const now = new Date().toISOString();
    await client
      .from('leads')
      .update({ label_sync_source: 'crm', label_synced_at: now })
      .eq('uuid', leadUuid);

    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'labels',
      status: 'success',
      payload: { conversationId, labels: nextLabels },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chatwoot] pushLabels failed: ${message}`);
    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'labels',
      status: 'failed',
      errorMessage: message,
      payload: { conversationId },
    });
    await sendTelegramToManagers(
      `[CRM] Chatwoot label sync failed for lead ${leadUuid}.\n${message}`,
    );
  }
}

/** CRM lead fields that map to Chatwoot labels. */
export const CRM_LABEL_SYNC_FIELDS = [
  'funnel_status',
  'student_stage',
  'persona_type',
  'special_state',
  'message_from',
  'lead_source',
] as const;

/**
 * Returns true when updates include any label-mapped lead field.
 */
export function hasLabelMappedLeadUpdates(updates: Record<string, unknown>): boolean {
  return CRM_LABEL_SYNC_FIELDS.some((field) => field in updates);
}

/**
 * Returns true when lead_details updates include label-mapped fields.
 */
export function hasLabelMappedDetailUpdates(updates: Record<string, unknown>): boolean {
  return 'uni_year' in updates || 'dorm_awaiting' in updates;
}
