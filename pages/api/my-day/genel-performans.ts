/**
 * Genel Performans metrics — all-time or range-scoped personal stats.
 * Mirrors /api/my-day/performance but supports range=all_time and passes
 * allTimeLeads: true so the Leadlerim KPI counts total portfolio (not just
 * leads claimed in the window).
 *
 * Query params:
 *   range: 'this_week' | 'this_month' | 'all_time'  (default: all_time)
 *   from:  ISO date string  (custom range start, overrides range)
 *   to:    ISO date string  (custom range end,   overrides range)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isPartnerOperator } from '@/lib/auth/roles';
import { getPerformancePayload, resolvePerformanceRange } from '@/lib/my-day/performance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (isPartnerOperator(session.role)) return sendError(res, 'Forbidden', 403);

  const { range, from, to } = req.query;

  // Default to all_time for the Genel tab.
  const rangeParam = typeof range === 'string' ? range : 'all_time';
  let dateRange = resolvePerformanceRange(rangeParam);

  // Allow explicit from/to override.
  if (typeof from === 'string' && typeof to === 'string') {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      dateRange = { from: fromDate, to: toDate };
    }
  }

  // allTimeLeads: true whenever no explicit windowed range is requested, so
  // the Leadlerim tile shows total portfolio rather than leads claimed in window.
  const allTimeLeads =
    rangeParam === 'all_time' && !(typeof from === 'string' && typeof to === 'string');

  try {
    const payload = await getPerformancePayload(session.userId, dateRange, { allTimeLeads });
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load genel performans';
    return sendError(res, message, 500);
  }
}
