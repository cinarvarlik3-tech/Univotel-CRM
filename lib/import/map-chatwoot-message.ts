/**
 * Maps Chatwoot dump message rows to old_lead_messages insert shape.
 */
import type { ChatwootMessageRow, ChatwootUserRow } from '@/lib/import/types';

export type OldLeadMessageType = 'incoming' | 'outgoing' | 'activity';
export type OldLeadSenderType = 'contact' | 'user' | 'system';

export interface MappedOldLeadMessage {
  chatwoot_message_id: number;
  chatwoot_conversation_id: number;
  message_type: OldLeadMessageType;
  content: string | null;
  sender_type: OldLeadSenderType | null;
  sender_id: number | null;
  sender_name: string | null;
  is_private: boolean;
  created_at: string;
}

/**
 * Resolves agent display name from Chatwoot users row.
 * @param user - Parsed Chatwoot user.
 */
export function resolveAgentDisplayName(user: ChatwootUserRow): string | null {
  const display = user.display_name?.trim();
  if (display) return display;
  const name = user.name?.trim();
  return name || null;
}

/**
 * Maps Chatwoot numeric message_type to CRM enum.
 * @param messageType - Chatwoot message_type (0=inbound, 1=outbound, 2=activity).
 */
export function mapChatwootMessageType(messageType: number): OldLeadMessageType | null {
  if (messageType === 0) return 'incoming';
  if (messageType === 1) return 'outgoing';
  if (messageType === 2) return 'activity';
  return null;
}

/**
 * Maps Chatwoot sender_type string to CRM enum.
 * @param senderType - Chatwoot sender_type from dump.
 * @param messageType - Mapped CRM message type.
 */
export function mapChatwootSenderType(
  senderType: string | null,
  messageType: OldLeadMessageType,
): OldLeadSenderType | null {
  if (messageType === 'activity') return 'system';
  if (senderType === 'Contact') return 'contact';
  if (senderType === 'User') return 'user';
  return null;
}

/**
 * Converts a parsed Chatwoot message into an old_lead_messages row (without lead_uuid).
 * @param message - Parsed message from dump.
 * @param users - Chatwoot users index for agent name lookup.
 * @param leadName - Lead display name for inbound messages.
 */
export function mapChatwootMessage(
  message: ChatwootMessageRow,
  users: Map<number, ChatwootUserRow>,
  leadName: string | null,
): MappedOldLeadMessage | null {
  const messageType = mapChatwootMessageType(message.message_type);
  if (!messageType) return null;

  const senderType = mapChatwootSenderType(message.sender_type, messageType);
  let senderName: string | null = null;

  if (messageType === 'incoming') {
    senderName = leadName?.trim() || null;
  } else if (messageType === 'outgoing' && message.sender_id != null) {
    const user = users.get(message.sender_id);
    senderName = user ? resolveAgentDisplayName(user) : null;
  }

  const content = message.content?.trim() ? message.content : null;

  return {
    chatwoot_message_id: message.id,
    chatwoot_conversation_id: message.conversation_id,
    message_type: messageType,
    content,
    sender_type: senderType,
    sender_id: message.sender_id,
    sender_name: senderName,
    is_private: message.private,
    created_at: message.created_at,
  };
}
