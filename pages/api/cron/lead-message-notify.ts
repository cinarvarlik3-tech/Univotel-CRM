/**
 * Lead-message notify cron endpoint — protected by CRON_SECRET Bearer token.
 * Drains unnotified inbound Chatwoot messages into per-salesperson Telegram pings.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { env } from '@/lib/env';
import { runLeadMessageNotifications } from '@/lib/jobs/run-lead-message-notify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  if (!verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const stats = await runLeadMessageNotifications();
    return sendSuccess(res, stats);
  } catch {
    return sendError(res, 'Failed to run lead message notifications', 500);
  }
}
