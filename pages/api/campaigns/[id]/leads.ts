/**
 * Paginated campaign_leads list for a campaign (manager-only).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (session.role !== 'manager') return sendError(res, 'Forbidden', 403);

  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid campaign ID', 400);

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50),
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const supabase = createServerSupabase(req, res);

  let query = supabase
    .from('campaign_leads')
    .select(
      'id, lead_uuid, status, sent_at, delivered_at, read_at, failed_reason, skipped_reason, wa_message_id, created_at, leads(lead_name, lead_phone)',
    )
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (status) query = query.eq('status', status);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;

  if (error) return sendError(res, 'Failed to fetch campaign leads', 500);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.created_at ?? null) : null;

  return sendSuccess(res, { items, nextCursor });
}
