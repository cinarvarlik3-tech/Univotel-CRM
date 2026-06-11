/**
 * Nurture task alert cron endpoint — protected by CRON_SECRET Bearer token.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env } from '@/lib/env';
import { runNurtureTaskAlerts } from '@/lib/jobs/run-nurture-task-alerts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const alerted = await runNurtureTaskAlerts();
    return sendSuccess(res, { alerted });
  } catch {
    return sendError(res, 'Failed to run nurture task alerts', 500);
  }
}
