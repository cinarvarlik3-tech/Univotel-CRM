/**
 * Maps Chatwoot Application API messages to lead_messages rows.
 */
import type { ChatwootApiMessage } from '@/lib/chatwoot/messages';
import type { ChatwootApiAgent } from '@/lib/chatwoot/types';
import {
  mapChatwootMessageType,
  mapChatwootSenderType,
  type MappedOldLeadMessage,
} from '@/lib/import/map-chatwoot-message';

/**
 * Normalizes Chatwoot API message_type to numeric dump semantics.
 * @param messageType - API message_type field.
 */
export function normalizeApiMessageType(messageType: number | string): number | null {
  if (typeof messageType === 'number') return messageType;
  const key = messageType.toLowerCase();
  if (key === 'incoming' || key === 'incoming_email') return 0;
  if (key === 'outgoing' || key === 'template') return 1;
  if (key === 'activity') return 2;
  return null;
}

/**
 * Parses Chatwoot API created_at (unix seconds or ISO string).
 * @param value - Raw created_at from API.
 */
export function parseChatwootApiTimestamp(value: number | string): string {
  if (typeof value === 'number') {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date(0).toISOString();
}

/**
 * Maps API sender.type to dump-style sender_type for shared mappers.
 * @param senderType - sender.type from API.
 */
function mapApiSenderTypeLabel(senderType: string | null | undefined): string | null {
  if (!senderType) return null;
  const key = senderType.toLowerCase();
  if (key === 'contact') return 'Contact';
  if (key === 'user' || key === 'agent') return 'User';
  return null;
}

/**
 * Converts a Chatwoot API message to lead_messages insert shape.
 * @param message - Message from Chatwoot API.
 * @param conversationId - Parent conversation id.
 * @param agentsById - Agent directory for name lookup.
 * @param leadName - CRM lead display name for inbound label.
 */
export function mapChatwootApiMessage(
  message: ChatwootApiMessage,
  conversationId: number,
  agentsById: Map<number, ChatwootApiAgent>,
  leadName: string | null,
): MappedOldLeadMessage | null {
  const numericType = normalizeApiMessageType(message.message_type);
  if (numericType == null) return null;

  const messageType = mapChatwootMessageType(numericType);
  if (!messageType) return null;

  const senderTypeLabel = mapApiSenderTypeLabel(message.sender?.type ?? null);
  const senderType = mapChatwootSenderType(senderTypeLabel, messageType);
  const senderId = message.sender?.id ?? null;

  let senderName: string | null = null;
  if (messageType === 'incoming') {
    senderName = message.sender?.name?.trim() || leadName?.trim() || null;
  } else if (messageType === 'outgoing') {
    if (message.sender?.name?.trim()) {
      senderName = message.sender.name.trim();
    } else if (senderId != null) {
      const agent = agentsById.get(senderId);
      senderName = agent?.name?.trim() ?? null;
    }
  }

  const content = message.content?.trim() ? message.content : null;

  return {
    chatwoot_message_id: message.id,
    chatwoot_conversation_id: conversationId,
    message_type: messageType,
    content,
    sender_type: senderType,
    sender_id: senderId,
    sender_name: senderName,
    is_private: Boolean(message.private),
    created_at: parseChatwootApiTimestamp(message.created_at),
  };
}
