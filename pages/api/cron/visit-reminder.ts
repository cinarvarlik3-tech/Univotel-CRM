/**
 * Visit reminder cron endpoint — protected by CRON_SECRET Bearer token.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env } from '@/lib/env';
import { runVisitReminder } from '@/lib/jobs/run-visit-reminder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const alerted = await runVisitReminder();
    return sendSuccess(res, { alerted });
  } catch {
    return sendError(res, 'Failed to run visit reminders', 500);
  }
}
