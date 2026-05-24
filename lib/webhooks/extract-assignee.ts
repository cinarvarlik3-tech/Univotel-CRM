/**
 * Extracts Chatwoot assignee references from webhook payloads.
 */
import type { ChatwootAgentRef } from '@/lib/chatwoot/types';
import type {
  ChatwootConversationCreated,
  ChatwootConversationUpdated,
  ChatwootMessageCreated,
} from '@/types/webhooks';

type AssigneeCarrier = {
  meta?: {
    assignee?: ChatwootAgentRef | null;
    sender?: unknown;
  };
  conversation?: {
    id?: number;
    meta?: {
      assignee?: ChatwootAgentRef | null;
    };
  };
};

/**
 * Coerces unknown assignee payload shapes into ChatwootAgentRef.
 * @param value - Raw assignee value from Chatwoot.
 */
export function coerceChatwootAgentRef(value: unknown): ChatwootAgentRef | null {
  if (value == null) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return { id: value };
  }

  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'number' ? record.id : undefined;
  const name = typeof record.name === 'string' ? record.name : null;
  const email =
    typeof record.email === 'string' ? record.email : record.email === null ? null : undefined;

  if (id == null && !name && email === undefined) return null;

  return { id, name, email: email ?? null };
}

/**
 * Reads assignee from meta or nested conversation.meta.
 * @param payload - Webhook payload carrying meta.
 */
export function extractAssigneeFromMeta(payload: AssigneeCarrier): ChatwootAgentRef | null {
  const direct = coerceChatwootAgentRef(payload.meta?.assignee);
  if (direct) return direct;

  return coerceChatwootAgentRef(payload.conversation?.meta?.assignee);
}

/**
 * Extracts assignee change from conversation_updated changed_attributes.
 * @param changedAttributes - Chatwoot changed_attributes array.
 */
export function extractAssigneeChange(
  changedAttributes: ChatwootConversationUpdated['changed_attributes'],
): { current: ChatwootAgentRef | null; previous: ChatwootAgentRef | null } | null {
  const keys = ['assignee_id', 'assignee'] as const;

  for (const attr of changedAttributes) {
    for (const key of keys) {
      if (!(key in attr)) continue;

      const change = attr[key] as { current_value?: unknown; previous_value?: unknown };
      return {
        current: coerceChatwootAgentRef(change.current_value),
        previous: coerceChatwootAgentRef(change.previous_value),
      };
    }
  }

  return null;
}

/**
 * Resolves assignee for inbound create/update events.
 * @param payload - Parsed Chatwoot webhook payload.
 */
export function resolveInboundAssignee(
  payload: ChatwootConversationCreated | ChatwootMessageCreated | ChatwootConversationUpdated,
): ChatwootAgentRef | null {
  if (payload.event === 'conversation_updated') {
    const change = extractAssigneeChange(payload.changed_attributes);
    if (change) return change.current;
    return extractAssigneeFromMeta(payload);
  }

  return extractAssigneeFromMeta(payload);
}
