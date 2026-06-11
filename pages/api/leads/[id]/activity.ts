/**
 * Per-lead activity timeline — merges stage history, contact history, visits, and tasks.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { buildActivityTimeline } from '@/lib/leads/build-activity-timeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  try {
    const events = await buildActivityTimeline(id);
    return sendSuccess(res, events);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build timeline';
    return sendError(res, message, 500);
  }
}
