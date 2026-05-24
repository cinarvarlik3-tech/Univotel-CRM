/**
 * Replay a failed webhook from stored payload — manager-only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { replayWebhookLog } from '@/lib/webhooks/replay-webhook-log';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (session.role !== 'manager') {
    return sendError(res, 'Forbidden', 403);
  }

  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid webhook log ID', 400);

  try {
    await replayWebhookLog(id);
    return sendSuccess(res, { replayed: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Webhook log not found') return sendError(res, message, 404);
    if (message === 'Only failed webhooks can be replayed') return sendError(res, message, 400);
    return sendError(res, `Replay failed: ${message}`, 500);
  }
}
