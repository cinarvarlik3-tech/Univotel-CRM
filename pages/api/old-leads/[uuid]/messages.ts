/**
 * Old lead messages API — paginated chat history for sidebar.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { uuid } = req.query;
  if (typeof uuid !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const before = typeof req.query.before === 'string' ? req.query.before : null;
  const limitRaw =
    typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : DEFAULT_LIMIT;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const supabase = createServerSupabase(req, res);

  const { data: lead, error: leadError } = await supabase
    .from('old_leads')
    .select('uuid')
    .eq('uuid', uuid)
    .maybeSingle();

  if (leadError) return sendError(res, 'Failed to fetch old lead', 500);
  if (!lead) return sendError(res, 'Old lead not found', 404);

  let query = supabase
    .from('old_lead_messages')
    .select(
      'id, message_type, content, sender_type, sender_name, created_at, chatwoot_conversation_id',
    )
    .eq('lead_uuid', uuid)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) return sendError(res, 'Failed to fetch messages', 500);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const messages = page.map(mapMessageRow).reverse();
  const oldestCursor = messages.length > 0 ? messages[0].createdAt : null;

  return sendSuccess(res, {
    messages,
    hasMore,
    oldestCursor,
  });
}
