/**
 * Task overdue alert cron endpoint — protected by CRON_SECRET Bearer token.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env } from '@/lib/env';
import { runTaskOverdueAlerts } from '@/lib/jobs/run-task-overdue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const alerted = await runTaskOverdueAlerts();
    return sendSuccess(res, { alerted });
  } catch {
    return sendError(res, 'Failed to run task overdue alerts', 500);
  }
}
