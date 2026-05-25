/**
 * Syncs Chatwoot conversation messages into lead_messages for a lead.
 */
import { listChatwootAgents } from '@/lib/chatwoot/client';
import { mapChatwootApiMessage } from '@/lib/chatwoot/map-api-message';
import { listConversationMessages } from '@/lib/chatwoot/messages';
import type { ChatwootApiAgent } from '@/lib/chatwoot/types';
import { createServiceClient } from '@/lib/supabase/service';

export interface SyncLeadMessagesResult {
  syncedCount: number;
  conversationId: number;
}

/**
 * Fetches messages from Chatwoot API and upserts into lead_messages.
 * @param params - Lead uuid, conversation id, and display name.
 */
export async function syncLeadMessagesFromChatwoot(params: {
  leadUuid: string;
  conversationId: number;
  leadName: string | null;
}): Promise<SyncLeadMessagesResult> {
  const apiMessages = await listConversationMessages(params.conversationId);
  const agents = await listChatwootAgents();
  const agentsById = new Map<number, ChatwootApiAgent>(agents.map((agent) => [agent.id, agent]));

  const now = new Date().toISOString();
  const rows = apiMessages
    .map((message) =>
      mapChatwootApiMessage(message, params.conversationId, agentsById, params.leadName),
    )
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map((row) => ({
      lead_uuid: params.leadUuid,
      chatwoot_message_id: row.chatwoot_message_id,
      chatwoot_conversation_id: row.chatwoot_conversation_id,
      message_type: row.message_type,
      content: row.content,
      sender_type: row.sender_type,
      sender_id: row.sender_id,
      sender_name: row.sender_name,
      is_private: row.is_private,
      created_at: row.created_at,
      synced_at: now,
    }));

  if (rows.length === 0) {
    return { syncedCount: 0, conversationId: params.conversationId };
  }

  const client = createServiceClient();
  const batchSize = 500;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await client.from('lead_messages').upsert(batch, {
      onConflict: 'chatwoot_message_id',
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`lead_messages upsert failed: ${error.message}`);
    }
  }

  return { syncedCount: rows.length, conversationId: params.conversationId };
}
