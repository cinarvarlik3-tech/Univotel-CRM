/**
 * Chatwoot conversation messages API.
 */
import { ChatwootApiError, chatwootFetch } from '@/lib/chatwoot/client';
import { isChatwootApiConfigured } from '@/lib/env';

/** Raw message row from Chatwoot Application API. */
export interface ChatwootApiMessage {
  id: number;
  content: string | null;
  message_type: number | string;
  created_at: number | string;
  private?: boolean;
  conversation_id?: number;
  sender?: {
    id?: number;
    name?: string | null;
    type?: string | null;
  } | null;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGES = 100;

function extractMessagePayload(json: unknown): ChatwootApiMessage[] {
  if (Array.isArray(json)) return json as ChatwootApiMessage[];
  if (json && typeof json === 'object') {
    const record = json as Record<string, unknown>;
    if (Array.isArray(record.payload)) return record.payload as ChatwootApiMessage[];
    if (Array.isArray(record.data)) return record.data as ChatwootApiMessage[];
  }
  return [];
}

/**
 * Lists all messages for a conversation (paginated API, aggregated).
 * @param conversationId - Chatwoot conversation id.
 */
export async function listConversationMessages(
  conversationId: number,
): Promise<ChatwootApiMessage[]> {
  if (!isChatwootApiConfigured()) {
    throw new Error('Chatwoot API is not configured');
  }

  const all: ChatwootApiMessage[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await chatwootFetch(`conversations/${conversationId}/messages?page=${page}`);

    if (!res.ok) {
      const body = await res.text();
      throw new ChatwootApiError(
        `list messages ${conversationId} page ${page} failed: ${res.status}`,
        res.status,
        body,
      );
    }

    const json = (await res.json()) as unknown;
    const batch = extractMessagePayload(json);
    if (batch.length === 0) break;

    all.push(...batch);
    if (batch.length < DEFAULT_PAGE_SIZE) break;
  }

  return all;
}
