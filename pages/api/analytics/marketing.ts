/**
 * Marketing tab API — manager/superadmin only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { parseOverviewRangeParam } from '@/lib/analytics/overview-range';
import { getMarketingPayload } from '@/lib/analytics/marketing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  const q = req.query;

  try {
    const payload = await getMarketingPayload({
      global: parseOverviewRangeParam(typeof q.global === 'string' ? q.global : undefined),
      sectionSource: parseOverviewRangeParam(
        typeof q.sectionSource === 'string' ? q.sectionSource : undefined,
      ),
      widgetLeadsBySource: parseOverviewRangeParam(
        typeof q.widgetLeadsBySource === 'string' ? q.widgetLeadsBySource : undefined,
      ),
      widgetConversionsBySource: parseOverviewRangeParam(
        typeof q.widgetConversionsBySource === 'string' ? q.widgetConversionsBySource : undefined,
      ),
    });
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load marketing analytics';
    return sendError(res, message, 500);
  }
}
