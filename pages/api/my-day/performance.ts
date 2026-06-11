/**
 * My Day performance metrics — conversion funnel, visit show-rate, activity volume, task completion.
 * Self-scoped to the requesting salesperson.
 *
 * Query params:
 *   range: 'this_week' | 'this_month'  (default: this_week)
 *   from: ISO date string  (custom range start, used when range is absent)
 *   to:   ISO date string  (custom range end)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { getPerformancePayload, resolvePerformanceRange } from '@/lib/my-day/performance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const { range, from, to } = req.query;

  let dateRange = resolvePerformanceRange(typeof range === 'string' ? range : undefined);

  // Allow explicit from/to override.
  if (typeof from === 'string' && typeof to === 'string') {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      dateRange = { from: fromDate, to: toDate };
    }
  }

  try {
    const payload = await getPerformancePayload(session.userId, dateRange);
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load performance';
    return sendError(res, message, 500);
  }
}
