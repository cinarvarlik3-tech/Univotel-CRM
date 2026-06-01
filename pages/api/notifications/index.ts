/**
 * Notifications list API — manager-only unresolved alerts.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

const MAX_LIMIT = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (!isManagerOrAbove(session.role)) {
    return sendError(res, 'Forbidden', 403);
  }

  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }

  const resolved = req.query.resolved === '1';
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50),
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const supabase = createServerSupabase(req, res);
  let query = supabase
    .from('notifications')
    .select(
      'id, alert_type, lead_uuid, task_id, message, is_resolved, created_at, leads(lead_name, lead_phone)',
    )
    .eq('is_resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return sendError(res, 'Failed to fetch notifications', 500);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.created_at ?? null) : null;

  return sendSuccess(res, { items, nextCursor });
}
