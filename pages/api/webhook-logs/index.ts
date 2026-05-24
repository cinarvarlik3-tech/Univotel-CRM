/**
 * webhook_logs list API — manager-only audit of inbound webhooks.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { listWebhookLogs } from '@/lib/webhooks/list-webhook-logs';

const MAX_LIMIT = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (session.role !== 'manager') {
    return sendError(res, 'Forbidden', 403);
  }

  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }

  const source = typeof req.query.source === 'string' ? req.query.source : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50),
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  try {
    const result = await listWebhookLogs({ source, status, limit, cursor });
    return sendSuccess(res, result);
  } catch {
    return sendError(res, 'Failed to fetch webhook logs', 500);
  }
}
