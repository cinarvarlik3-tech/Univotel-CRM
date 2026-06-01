/**
 * Unarchive lead API route — manager-only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { unarchiveLead } from '@/lib/leads/archive';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { uuid } = req.query;
  if (typeof uuid !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);
  const { data: existing } = await supabase
    .from('archived_leads')
    .select('uuid')
    .eq('uuid', uuid)
    .maybeSingle();

  if (!existing) return sendError(res, 'Archived lead not found', 404);

  try {
    const result = await unarchiveLead(uuid, session.userId);
    return sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unarchive failed';
    return sendError(res, message, 500);
  }
}
