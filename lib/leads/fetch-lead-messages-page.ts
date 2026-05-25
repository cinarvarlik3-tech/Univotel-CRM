/**
 * Reads paginated lead_messages for API responses.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { ChatMessageRow } from '@/types/domain';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function mapMessageRow(row: {
  id: string;
  message_type: string;
  content: string | null;
  sender_type: string | null;
  sender_name: string | null;
  created_at: string;
  chatwoot_conversation_id: number;
}): ChatMessageRow {
  return {
    id: row.id,
    messageType: row.message_type as ChatMessageRow['messageType'],
    content: row.content,
    senderType: row.sender_type as ChatMessageRow['senderType'],
    senderName: row.sender_name,
    createdAt: row.created_at,
    chatwootConversationId: row.chatwoot_conversation_id,
  };
}

export interface LeadMessagesPage {
  messages: ChatMessageRow[];
  hasMore: boolean;
  oldestCursor: string | null;
}

/**
 * Fetches a page of non-private messages for a lead (newest chunk, ascending for UI).
 * @param supabase - Authenticated or service Supabase client.
 * @param leadUuid - Lead UUID.
 * @param options - Pagination options.
 */
export async function fetchLeadMessagesPage(
  supabase: SupabaseClient<Database>,
  leadUuid: string,
  options?: { before?: string | null; limit?: number },
): Promise<LeadMessagesPage> {
  const limitRaw = options?.limit ?? DEFAULT_LIMIT;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  let query = supabase
    .from('lead_messages')
    .select(
      'id, message_type, content, sender_type, sender_name, created_at, chatwoot_conversation_id',
    )
    .eq('lead_uuid', leadUuid)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options?.before) {
    query = query.lt('created_at', options.before);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const messages = page.map(mapMessageRow).reverse();
  const oldestCursor = messages.length > 0 ? messages[0].createdAt : null;

  return { messages, hasMore, oldestCursor };
}
