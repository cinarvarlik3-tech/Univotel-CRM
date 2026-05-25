/**
 * Active lead messages API — paginated read from lead_messages cache.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { fetchLeadMessagesPage } from '@/lib/leads/fetch-lead-messages-page';
import { loadLeadForChatSync } from '@/lib/leads/load-lead-for-chat-sync';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const before = typeof req.query.before === 'string' ? req.query.before : null;
  const limitRaw =
    typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;

  const supabase = createServerSupabase(req, res);

  try {
    const loaded = await loadLeadForChatSync(supabase, id);
    if ('error' in loaded) {
      if (loaded.error === 'not_found') return sendError(res, 'Lead not found', 404);
      return sendSuccess(res, { messages: [], hasMore: false, oldestCursor: null });
    }

    const page = await fetchLeadMessagesPage(supabase, id, {
      before,
      limit: limitRaw,
    });

    return sendSuccess(res, page);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages';
    console.error('[leads/messages]', message);
    return sendError(res, 'Failed to fetch messages', 500);
  }
}
