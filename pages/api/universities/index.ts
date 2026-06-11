/**
 * GET /api/universities — returns all active universities ordered by name.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const supabase = createServerSupabase(req, res);

  const { data, error } = await supabase
    .from('universities')
    .select(
      'id, uni_name, uni_shortname, district, city, country, yok_code, is_active, created_at, updated_at',
    )
    .eq('is_active', true)
    .order('uni_name', { ascending: true });

  if (error) return sendError(res, 'Failed to fetch universities', 500);
  return sendSuccess(res, data ?? []);
}
