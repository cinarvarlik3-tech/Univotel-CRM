/**
 * Builds old_lead_messages rows from Chatwoot dump messages and old_leads map.
 */
import {
  buildConversationLeadMap,
  type OldLeadConversationSource,
} from '@/lib/import/build-conversation-lead-map';
import { mapChatwootMessage } from '@/lib/import/map-chatwoot-message';
import type { ChatwootMessageRow, ChatwootUserRow } from '@/lib/import/types';

export interface OldLeadMessageInsert {
  lead_uuid: string;
  chatwoot_message_id: number;
  chatwoot_conversation_id: number;
  message_type: 'incoming' | 'outgoing' | 'activity';
  content: string | null;
  sender_type: 'contact' | 'user' | 'system' | null;
  sender_id: number | null;
  sender_name: string | null;
  is_private: boolean;
  created_at: string;
}

export interface BuildOldLeadMessagesResult {
  rows: OldLeadMessageInsert[];
  stats: {
    messagesParsed: number;
    mapped: number;
    orphaned: number;
    skippedType: number;
    byType: { incoming: number; outgoing: number; activity: number };
    privateCount: number;
    withSenderName: number;
  };
}

/**
 * Maps dump messages to insert rows for old_lead_messages.
 * @param messages - All messages from Chatwoot dump.
 * @param users - Chatwoot users for agent name enrichment.
 * @param leads - Old leads from Supabase (conversation mapping).
 */
export function buildOldLeadMessageRows(
  messages: ChatwootMessageRow[],
  users: Map<number, ChatwootUserRow>,
  leads: OldLeadConversationSource[],
): BuildOldLeadMessagesResult {
  const { conversationToLead, leadNames } = buildConversationLeadMap(leads);

  const rows: OldLeadMessageInsert[] = [];
  const stats = {
    messagesParsed: messages.length,
    mapped: 0,
    orphaned: 0,
    skippedType: 0,
    byType: { incoming: 0, outgoing: 0, activity: 0 },
    privateCount: 0,
    withSenderName: 0,
  };

  for (const message of messages) {
    const leadUuid = conversationToLead.get(message.conversation_id);
    if (!leadUuid) {
      stats.orphaned++;
      continue;
    }

    const leadName = leadNames.get(leadUuid) ?? null;
    const mapped = mapChatwootMessage(message, users, leadName);
    if (!mapped) {
      stats.skippedType++;
      continue;
    }

    stats.mapped++;
    stats.byType[mapped.message_type]++;
    if (mapped.is_private) stats.privateCount++;
    if (mapped.sender_name) stats.withSenderName++;

    rows.push({
      lead_uuid: leadUuid,
      ...mapped,
    });
  }

  rows.sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.chatwoot_message_id - b.chatwoot_message_id,
  );

  return { rows, stats };
}
