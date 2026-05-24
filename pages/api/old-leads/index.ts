/**
 * Old leads list API route — manager/superadmin, cursor pagination.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { buildCursorResponse, parseCursorParams } from '@/lib/query/cursor';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const supabase = createServerSupabase(req, res);
  const { cursor, limit } = parseCursorParams(req.query);

  const leadSource = typeof req.query.lead_source === 'string' ? req.query.lead_source : undefined;
  const messageFrom =
    typeof req.query.message_from === 'string' ? req.query.message_from : undefined;
  const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let query = supabase
    .from('old_leads')
    .select(
      'uuid, lead_name, lead_phone, lead_source, message_from, funnel_status, student_stage, created_at, last_contact_at, chatwoot_conversation_id, salespeople:assigned_to(full_name, email), old_lead_details(university)',
    )
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (leadSource) {
    query = query.eq('lead_source', leadSource);
  }
  if (messageFrom) {
    query = query.eq('message_from', messageFrom);
  }
  if (searchTerm.length > 0) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`lead_name.ilike.${pattern},lead_phone.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) return sendError(res, 'Failed to fetch old leads', 500);

  const { data: rows, nextCursor } = buildCursorResponse(
    (data ?? []) as Record<string, unknown>[],
    limit,
    'created_at',
  );

  return sendSuccess(res, { oldLeads: rows, nextCursor });
}
