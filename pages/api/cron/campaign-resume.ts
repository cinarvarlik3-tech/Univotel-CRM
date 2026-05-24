/**
 * Campaign worker resume cron — starts workers for campaigns with pending leads.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env } from '@/lib/env';
import { runCampaignResumeCheck } from '@/lib/jobs/run-campaign-resume';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const started = await runCampaignResumeCheck();
    return sendSuccess(res, { started });
  } catch {
    return sendError(res, 'Failed to resume campaigns', 500);
  }
}
