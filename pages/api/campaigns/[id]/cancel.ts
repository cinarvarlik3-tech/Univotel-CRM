/**
 * Cancel a running campaign.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (session.role !== 'manager') return sendError(res, 'Forbidden', 403);

  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid campaign ID', 400);

  const supabase = createServerSupabase(req, res);

  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return sendError(res, 'Failed to cancel campaign', 500);
  if (!data) return sendError(res, 'Campaign not found', 404);

  return sendSuccess(res, { cancelled: true });
}
