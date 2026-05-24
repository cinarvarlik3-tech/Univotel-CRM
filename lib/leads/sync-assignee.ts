/**
 * Synchronizes leads.assigned_to with Chatwoot conversation assignee (CRM-side).
 */
import { assignChatwootConversation } from '@/lib/chatwoot/client';
import { resolveChatwootConversationId } from '@/lib/chatwoot/conversation-id';
import {
  persistChatwootUserIdMapping,
  resolveChatwootAgentFromSalesperson,
  resolveSalespersonFromChatwoot,
} from '@/lib/chatwoot/resolve-agent';
import type { ChatwootAgentRef } from '@/lib/chatwoot/types';
import { decrementActiveLeadCount, incrementActiveLeadCount } from '@/lib/leads/assign';
import { shouldSkipInboundEcho } from '@/lib/chatwoot/sync-engine';
import { logChatwootSync } from '@/lib/chatwoot/sync-log';
import { isChatwootAssigneeSyncEnabled } from '@/lib/env';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToManagers } from '@/lib/telegram';
import type { Json } from '@/types/database';

export type AssigneeSyncSource = 'chatwoot' | 'crm';

export type SyncAssigneeResult =
  | { type: 'updated' }
  | { type: 'skipped'; reason: string }
  | { type: 'no_conversation' };

interface SyncAssigneeParams {
  leadUuid: string;
  newAssignedTo: string | null;
  syncSource: AssigneeSyncSource;
  conversationId?: number | null;
  chatwootAgent?: ChatwootAgentRef | null;
  interactionSource?: 'whatsapp' | 'instagram' | 'manual';
}

/**
 * Updates CRM lead assignee, counters, and contact history.
 * @param params - Sync parameters.
 */
export async function syncAssigneeToLead(params: SyncAssigneeParams): Promise<SyncAssigneeResult> {
  if (!isChatwootAssigneeSyncEnabled() && params.syncSource === 'chatwoot') {
    return { type: 'skipped', reason: 'assignee sync disabled' };
  }

  const client = createServiceClient();

  const { data: lead, error } = await client
    .from('leads')
    .select(
      'uuid, assigned_to, assignee_sync_source, assignee_synced_at, chatwoot_conversation_id, source_details, message_from',
    )
    .eq('uuid', params.leadUuid)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .maybeSingle();

  if (error || !lead) {
    throw new Error(`syncAssignee: lead lookup failed: ${error?.message ?? 'not found'}`);
  }

  if (
    params.syncSource === 'chatwoot' &&
    shouldSkipInboundEcho(lead.assignee_sync_source, lead.assignee_synced_at)
  ) {
    return { type: 'skipped', reason: 'crm echo window' };
  }

  if (params.newAssignedTo === lead.assigned_to) {
    const convId = params.conversationId ?? resolveChatwootConversationId(lead);
    if (convId != null && lead.chatwoot_conversation_id !== convId) {
      await client
        .from('leads')
        .update({ chatwoot_conversation_id: convId })
        .eq('uuid', params.leadUuid);
    }
    return { type: 'skipped', reason: 'assignee unchanged' };
  }

  const previousAssignedTo = lead.assigned_to;
  const conversationId = params.conversationId ?? resolveChatwootConversationId(lead) ?? null;

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from('leads')
    .update({
      assigned_to: params.newAssignedTo,
      assignee_sync_source: params.syncSource,
      assignee_synced_at: now,
      chatwoot_conversation_id: conversationId,
    })
    .eq('uuid', params.leadUuid);

  if (updateError) {
    throw new Error(`syncAssignee: leads update failed: ${updateError.message}`);
  }

  if (previousAssignedTo) {
    await decrementActiveLeadCount(previousAssignedTo);
  }
  if (params.newAssignedTo) {
    await incrementActiveLeadCount(params.newAssignedTo);
  }

  const interactionSource =
    params.interactionSource ??
    (lead.message_from === 'instagram' || lead.message_from === 'whatsapp'
      ? lead.message_from
      : 'whatsapp');

  await client.from('contact_history').insert({
    lead_uuid: params.leadUuid,
    interaction_type: 'reassignment',
    interaction_source: interactionSource,
    notes:
      params.syncSource === 'chatwoot'
        ? 'Assignee synced from Chatwoot.'
        : 'Assignee updated in CRM.',
    metadata: {
      sync_source: params.syncSource,
      previous_assigned_to: previousAssignedTo,
      new_assigned_to: params.newAssignedTo,
      chatwoot_conversation_id: conversationId,
      chatwoot_assignee: params.chatwootAgent ?? null,
    } as Json,
  });

  if (params.syncSource === 'chatwoot' && params.chatwootAgent?.id && params.newAssignedTo) {
    await persistChatwootUserIdMapping(params.newAssignedTo, params.chatwootAgent.id);
  }

  return { type: 'updated' };
}

/**
 * Applies Chatwoot assignee from webhook to an existing or new lead.
 * @param leadUuid - CRM lead UUID.
 * @param agent - Chatwoot assignee reference (null = unassign in Chatwoot, CRM unchanged).
 * @param conversationId - Chatwoot conversation id.
 */
export async function applyChatwootAssigneeToLead(
  leadUuid: string,
  agent: ChatwootAgentRef | null,
  conversationId: number,
): Promise<SyncAssigneeResult> {
  if (!agent) {
    return { type: 'skipped', reason: 'chatwoot assignee cleared' };
  }

  const resolved = await resolveSalespersonFromChatwoot(agent);
  if (resolved.type === 'not_found') {
    console.warn(
      `[chatwoot] assignee not mapped name=${agent.name ?? 'n/a'} id=${agent.id ?? 'n/a'}`,
    );
    return { type: 'skipped', reason: 'assignee not found' };
  }

  if (resolved.type === 'ambiguous') {
    console.warn(`[chatwoot] assignee ambiguous: ${resolved.reason}`);
    await sendTelegramToManagers(
      `[CRM] Chatwoot assignee ambiguous for lead ${leadUuid}.\n${resolved.reason}`,
    );
    return { type: 'skipped', reason: resolved.reason };
  }

  return syncAssigneeToLead({
    leadUuid,
    newAssignedTo: resolved.salespersonId,
    syncSource: 'chatwoot',
    conversationId,
    chatwootAgent: agent,
  });
}

/**
 * Pushes CRM assignee to Chatwoot when conversation is linked.
 * @param leadUuid - CRM lead UUID.
 * @param newAssignedTo - New salesperson UUID or null.
 */
export async function pushAssigneeToChatwoot(
  leadUuid: string,
  newAssignedTo: string | null,
): Promise<void> {
  if (!isChatwootAssigneeSyncEnabled()) return;

  const client = createServiceClient();
  const { data: lead } = await client
    .from('leads')
    .select('chatwoot_conversation_id, source_details')
    .eq('uuid', leadUuid)
    .maybeSingle();

  if (!lead) return;

  const conversationId = resolveChatwootConversationId(lead);
  if (conversationId == null) {
    console.info(`[chatwoot] outbound assign skipped — no conversation for lead ${leadUuid}`);
    return;
  }

  let chatwootAssigneeId: number | null = null;

  if (newAssignedTo) {
    chatwootAssigneeId = await resolveChatwootAgentFromSalesperson(newAssignedTo);
    if (chatwootAssigneeId == null) {
      await sendTelegramToManagers(
        `[CRM] Could not map CRM assignee to Chatwoot for lead ${leadUuid}. Update salespeople.chatwoot_user_id or email.`,
      );
      await logChatwootSync({
        leadUuid,
        direction: 'outbound',
        operation: 'assignee',
        status: 'skipped',
        payload: { reason: 'agent_not_mapped' },
      });
      return;
    }

    await persistChatwootUserIdMapping(newAssignedTo, chatwootAssigneeId);
  }

  try {
    await assignChatwootConversation(conversationId, chatwootAssigneeId);
    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'assignee',
      status: 'success',
      payload: { conversationId, assigneeId: chatwootAssigneeId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chatwoot] outbound assign failed: ${message}`);
    await logChatwootSync({
      leadUuid,
      direction: 'outbound',
      operation: 'assignee',
      status: 'failed',
      errorMessage: message,
      payload: { conversationId },
    });
    await sendTelegramToManagers(
      `[CRM] Chatwoot assign API failed for lead ${leadUuid}.\n${message}`,
    );
  }
}
