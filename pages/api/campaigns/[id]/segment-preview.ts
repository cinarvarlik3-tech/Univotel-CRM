/**
 * Campaign segment preview — returns lead count for segment without side effects.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { countSegmentLeads } from '@/lib/campaigns/resolve-segment';
import { createServerSupabase } from '@/lib/supabase/server';
import type { CampaignSegment } from '@/types/domain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (session.role !== 'manager') return sendError(res, 'Forbidden', 403);

  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid campaign ID', 400);

  const supabase = createServerSupabase(req, res);
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('segment, language')
    .eq('id', id)
    .maybeSingle();

  if (error) return sendError(res, 'Failed to load campaign', 500);
  if (!campaign) return sendError(res, 'Campaign not found', 404);

  const segment = campaign.segment as unknown as CampaignSegment;
  const count = await countSegmentLeads(segment, campaign.language);

  return sendSuccess(res, { count });
}
