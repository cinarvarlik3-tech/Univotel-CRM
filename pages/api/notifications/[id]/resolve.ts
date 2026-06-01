/**
 * Resolve a manager notification — marks alert as acknowledged.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (!isManagerOrAbove(session.role)) {
    return sendError(res, 'Forbidden', 403);
  }

  if (req.method !== 'PATCH') {
    return sendError(res, 'Method not allowed', 405);
  }

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid notification ID', 400);

  const supabase = createServerSupabase(req, res);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_resolved: true,
      resolved_by: session.userId,
      resolved_at: now,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return sendError(res, 'Failed to resolve notification', 500);
  if (!data) return sendError(res, 'Notification not found', 404);

  return sendSuccess(res, { resolved: true });
}
