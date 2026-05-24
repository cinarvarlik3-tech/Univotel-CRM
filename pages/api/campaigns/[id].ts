/**
 * Single campaign detail API with campaign_leads summary counts.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid campaign ID', 400);

  const supabase = createServerSupabase(req, res);

  let query = supabase.from('campaigns').select('*').eq('id', id);

  if (session.role !== 'manager') {
    query = query.eq('created_by', session.userId);
  }

  const { data: campaign, error } = await query.maybeSingle();

  if (error) return sendError(res, 'Failed to fetch campaign', 500);
  if (!campaign) return sendError(res, 'Campaign not found', 404);

  const { data: leads } = await supabase
    .from('campaign_leads')
    .select('status')
    .eq('campaign_id', id);

  const summary = {
    total: leads?.length ?? 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of leads ?? []) {
    const key = row.status as keyof typeof summary;
    if (key in summary && key !== 'total') {
      summary[key]++;
    }
  }

  return sendSuccess(res, { campaign, summary });
}
