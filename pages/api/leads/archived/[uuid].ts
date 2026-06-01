/**
 * Single archived lead detail API route — manager-only.
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

  const { uuid } = req.query;
  if (typeof uuid !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);

  const [leadRes, historyRes, detailsRes] = await Promise.all([
    supabase
      .from('archived_leads')
      .select('*, salespeople:assigned_to(full_name, email)')
      .eq('uuid', uuid)
      .maybeSingle(),
    supabase
      .from('archived_contact_history')
      .select('*')
      .eq('lead_uuid', uuid)
      .order('created_at', { ascending: false }),
    supabase.from('lead_details').select('*').eq('lead_uuid', uuid).maybeSingle(),
  ]);

  if (leadRes.error || historyRes.error || detailsRes.error) {
    return sendError(res, 'Failed to fetch archived lead', 500);
  }
  if (!leadRes.data) return sendError(res, 'Archived lead not found', 404);

  return sendSuccess(res, {
    lead: leadRes.data,
    contactHistory: historyRes.data ?? [],
    leadDetails: detailsRes.data ?? null,
  });
}
