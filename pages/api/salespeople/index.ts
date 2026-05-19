/**
 * Salespeople list API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const supabase = createServerSupabase(req, res);

  if (session.role === 'manager') {
    const { data, error } = await supabase.from('salespeople').select('*').order('full_name');
    if (error) return sendError(res, 'Failed to fetch salespeople', 500);
    return sendSuccess(res, data ?? []);
  }

  return sendSuccess(res, [session.salesperson]);
}
