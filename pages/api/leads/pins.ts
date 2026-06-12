/**
 * GET /api/leads/pins — returns the current agent's pinned lead UUIDs (D7, §1.2).
 * Pins are personal and private; returned set is always agent-scoped via RLS.
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
    .from('lead_pins')
    .select('lead_uuid')
    .eq('agent_id', session.userId)
    .order('created_at', { ascending: false });

  if (error) return sendError(res, 'Failed to fetch pins', 500);

  return sendSuccess(res, data ?? []);
}
