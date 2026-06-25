/**
 * Salesperson leaderboard API (manager/superadmin only).
 *
 * Query params:
 *   range:         off | today | this_week | this_month | all_time | custom:YYYY-MM-DD:YYYY-MM-DD
 *   sort:          revenue | leads | messages | conversion | visits | sales | lateness (default: revenue)
 *   includeKapora: 'true' | 'false' (default false)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { parseOverviewRangeParam, resolveEffectiveRange } from '@/lib/analytics/overview-range';
import {
  getSalespersonLeaderboard,
  type LeaderboardSortKey,
} from '@/lib/analytics/salesperson-leaderboard';

const VALID_SORTS = new Set<LeaderboardSortKey>([
  'revenue',
  'leads',
  'messages',
  'conversion',
  'visits',
  'sales',
  'lateness',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  const { range, sort, includeKapora } = req.query;

  const rangeSelection = parseOverviewRangeParam(typeof range === 'string' ? range : undefined);
  const resolvedRange = resolveEffectiveRange(
    rangeSelection,
    { mode: 'off' },
    undefined,
    'this_month',
  );

  const sortKey: LeaderboardSortKey =
    typeof sort === 'string' && VALID_SORTS.has(sort as LeaderboardSortKey)
      ? (sort as LeaderboardSortKey)
      : 'revenue';

  const kapora = includeKapora === 'true';

  try {
    const payload = await getSalespersonLeaderboard(resolvedRange, sortKey, kapora);
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load salesperson leaderboard';
    return sendError(res, message, 500);
  }
}
