/**
 * Loads an active lead row for Chatwoot message sync (access-checked via caller's client).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveChatwootConversationId } from '@/lib/chatwoot/conversation-id';
import type { Database } from '@/types/database';

export interface LeadForChatSync {
  uuid: string;
  lead_name: string | null;
  chatwoot_conversation_id: number | null;
  source_details: Record<string, unknown> | null;
}

/**
 * Loads a non-archived lead visible to the current user session.
 * @param supabase - User-scoped Supabase client (RLS applies).
 * @param leadUuid - Lead UUID.
 */
export async function loadLeadForChatSync(
  supabase: SupabaseClient<Database>,
  leadUuid: string,
): Promise<
  | { lead: LeadForChatSync; conversationId: number }
  | { error: 'not_found' }
  | { error: 'no_conversation' }
> {
  const { data, error } = await supabase
    .from('leads')
    .select('uuid, lead_name, chatwoot_conversation_id, source_details')
    .eq('uuid', leadUuid)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { error: 'not_found' };

  const sourceDetails =
    data.source_details &&
    typeof data.source_details === 'object' &&
    !Array.isArray(data.source_details)
      ? (data.source_details as Record<string, unknown>)
      : null;

  const lead: LeadForChatSync = {
    uuid: data.uuid,
    lead_name: data.lead_name,
    chatwoot_conversation_id: data.chatwoot_conversation_id,
    source_details: sourceDetails,
  };

  const conversationId = resolveChatwootConversationId(lead);
  if (conversationId == null) return { error: 'no_conversation' };

  return { lead, conversationId };
}
