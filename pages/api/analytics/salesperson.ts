/**
 * Per-salesperson analytics API (manager/superadmin only).
 *
 * Query params:
 *   rep:           salesperson UUID (required)
 *   range:         off | today | this_week | this_month | all_time | custom:YYYY-MM-DD:YYYY-MM-DD
 *   includeKapora: 'true' | 'false' (default false)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { parseOverviewRangeParam, resolveEffectiveRange } from '@/lib/analytics/overview-range';
import { getSalespersonPayload } from '@/lib/analytics/salesperson';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  const { rep, range, includeKapora } = req.query;

  if (typeof rep !== 'string' || rep.length === 0) {
    return sendError(res, 'Missing required param: rep', 400);
  }

  const rangeSelection = parseOverviewRangeParam(typeof range === 'string' ? range : undefined);
  const resolvedRange = resolveEffectiveRange(
    rangeSelection,
    { mode: 'off' },
    undefined,
    'this_month',
  );
  const kapora = includeKapora === 'true';

  try {
    const payload = await getSalespersonPayload(rep, resolvedRange, kapora);
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load salesperson analytics';
    return sendError(res, message, 500);
  }
}
