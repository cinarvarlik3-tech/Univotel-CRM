/**
 * 24h restriction cron endpoint — protected by CRON_SECRET Bearer token.
 * Flags leads whose WhatsApp 24h window has closed (no incoming message for 24h).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env } from '@/lib/env';
import { runTwentyFourHourRestriction } from '@/lib/jobs/run-24h-restriction';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const restricted = await runTwentyFourHourRestriction();
    return sendSuccess(res, { restricted });
  } catch {
    return sendError(res, 'Failed to run 24h restriction', 500);
  }
}
