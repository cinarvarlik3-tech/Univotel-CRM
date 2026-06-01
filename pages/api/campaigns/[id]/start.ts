/**
 * Start campaign worker — bulk inserts campaign_leads and runs async worker.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { runCampaignWorker } from '@/lib/campaigns/run-campaign-worker';
import { startCampaign } from '@/lib/jobs/start-campaign';
import { runAfterResponse } from '@/lib/webhooks/wait-until';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid campaign ID', 400);

  try {
    const result = await startCampaign(id);
    runAfterResponse(runCampaignWorker(id));
    return sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Campaign not found') return sendError(res, message, 404);
    if (message.includes('not yet supported') || message.includes('No leads match')) {
      return sendError(res, message, 400);
    }
    return sendError(res, message, 500);
  }
}
