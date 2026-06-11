/**
 * Two-way custom-attribute sync: CRM field changes → Chatwoot conversation attributes.
 */
import { updateConversationCustomAttributes } from '@/lib/chatwoot/client';
import {
  buildCustomAttributesFromCrm,
  type CrmCustomAttrState,
} from '@/lib/chatwoot/sync-custom-attributes';
import { getConversationIdForLead } from '@/lib/chatwoot/sync-engine';
import { logChatwootSync } from '@/lib/chatwoot/sync-log';
import { isChatwootLabelSyncEnabled } from '@/lib/env';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToManagers } from '@/lib/telegram';

/**
 * Marks a lead as recently synced from CRM (shared echo guard with label sync).
 */
export async function markCrmChatwootOutboundSync(leadUuid: string): Promise<void> {
  const client = createServiceClient();
  const now = new Date().toISOString();
  await client
    .from('leads')
    .update({ label_sync_source: 'crm', label_synced_at: now })
    .eq('uuid', leadUuid);
}

/**
 * Loads CRM state and pushes custom attributes to Chatwoot.
 */
export async function pushCustomAttributesToChatwoot(leadUuid: string): Promise<void> {
  if (!isChatwootLabelSyncEnabled()) return;

  const client = createServiceClient();

  const { data: lead, error: leadError } = await client
    .from('leads')
    .select('uuid, loss_reason, chatwoot_conversation_id, source_details')
    .eq('uuid', leadUuid)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .maybeSingle();

  if (leadError || !lead) {
    console.warn(`[chatwoot] pushCustomAttrs: lead not found ${leadUuid}`);
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
      operation: 'custom_attributes',
      status: 'skipped',
      payload: { reason: 'no_conversation' },
    });
    return;
  }

  const { data: details } = await client
    .from('lead_details')
    .select(
      'university, budget_tier, move_in, room_category, room_type, student_gender, interested_hotel',
    )
    .eq('lead_uuid', leadUuid)
    .maybeSingle();

  const crmState: CrmCustomAttrState = {
    loss_reason: lead.loss_reason,
    university: details?.university ?? null,
    budget_tier: details?.budget_tier ?? null,
    move_in: details?.move_in ?? null,
    room_category: details?.room_category ?? null,
    room_type: [...(details?.room_type ?? [])],
    student_gender: details?.student_gender ?? null,
    interested_hotel: details?.interested_hotel ?? [],
  };

  const customAttributes = buildCustomAttributesFromCrm(crmState);
  if (Object.keys(customAttributes).length === 0) {
    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'custom_attributes',
      status: 'skipped',
      payload: { reason: 'empty_payload' },
    });
    return;
  }

  try {
    await updateConversationCustomAttributes(conversationId, customAttributes);
    await markCrmChatwootOutboundSync(leadUuid);

    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'custom_attributes',
      status: 'success',
      payload: { conversationId, customAttributes },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chatwoot] pushCustomAttrs failed: ${message}`);
    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'custom_attributes',
      status: 'failed',
      errorMessage: message,
      payload: { conversationId },
    });
    await sendTelegramToManagers(
      `[CRM] Chatwoot custom-attribute sync failed for lead ${leadUuid}.\n${message}`,
    );
  }
}
