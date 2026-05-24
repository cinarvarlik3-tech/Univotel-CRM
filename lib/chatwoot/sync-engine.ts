/**
 * Shared helpers for CRM ↔ Chatwoot two-way sync (echo guards, conversation link).
 */
import { env } from '@/lib/env';
import { resolveChatwootConversationId } from '@/lib/chatwoot/conversation-id';
import { createServiceClient } from '@/lib/supabase/service';

export type ChatwootSyncSource = 'chatwoot' | 'crm';

/**
 * Returns true when an inbound webhook should be ignored as a recent CRM echo.
 */
export function shouldSkipInboundEcho(syncSource: string | null, syncedAt: string | null): boolean {
  if (syncSource !== 'crm' || !syncedAt) return false;
  const ageMs = Date.now() - new Date(syncedAt).getTime();
  return ageMs >= 0 && ageMs < env.CHATWOOT_SYNC_ECHO_WINDOW_MS;
}

/**
 * Persists Chatwoot conversation (and optional contact) ids on a lead row.
 */
export async function persistChatwootConversationLink(
  leadUuid: string,
  conversationId: number,
  contactId?: number | null,
): Promise<void> {
  const client = createServiceClient();
  const patch: {
    chatwoot_conversation_id: number;
    chatwoot_contact_id?: number;
  } = { chatwoot_conversation_id: conversationId };

  if (contactId != null) {
    patch.chatwoot_contact_id = contactId;
  }

  const { error } = await client.from('leads').update(patch).eq('uuid', leadUuid);

  if (error) {
    throw new Error(`persistChatwootConversationLink failed: ${error.message}`);
  }
}

/** Lead row subset for resolving Chatwoot conversation id. */
export interface LeadConversationRow {
  chatwoot_conversation_id: number | null;
  source_details: Record<string, unknown> | null;
}

/**
 * Resolves conversation id from column or source_details.
 */
export function getConversationIdForLead(lead: LeadConversationRow): number | null {
  return resolveChatwootConversationId(lead);
}
