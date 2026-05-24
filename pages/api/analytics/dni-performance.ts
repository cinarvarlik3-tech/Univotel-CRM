/**
 * DNI performance analytics API for admin dashboard stats.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const supabase = createServerSupabase(req, res);
  const { data, error } = await supabase
    .from('dni_numbers')
    .select('id, source, display_label, virtual_number, is_active, lead_count, last_lead_at')
    .order('lead_count', { ascending: false });

  if (error) return sendError(res, 'Failed to load DNI performance', 500);
  return sendSuccess(res, data ?? []);
}
