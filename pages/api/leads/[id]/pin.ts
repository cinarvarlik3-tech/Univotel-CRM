/**
 * Lead pin toggle — POST to pin, DELETE to unpin (D7, §1.2).
 * Pins are personal and private; backed by `lead_pins` table with per-agent RLS.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return sendError(res, 'Method not allowed', 405);
  }

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'POST') {
    const { error } = await supabase
      .from('lead_pins')
      .upsert({ agent_id: session.userId, lead_uuid: id }, { onConflict: 'agent_id,lead_uuid' });
    if (error) return sendError(res, 'Failed to pin lead', 500);
    return sendSuccess(res, { pinned: true });
  }

  // DELETE — unpin
  const { error } = await supabase
    .from('lead_pins')
    .delete()
    .eq('agent_id', session.userId)
    .eq('lead_uuid', id);
  if (error) return sendError(res, 'Failed to unpin lead', 500);
  return sendSuccess(res, { pinned: false });
}
