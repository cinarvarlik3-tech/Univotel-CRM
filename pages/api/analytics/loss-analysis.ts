/**
 * Loss Analysis tab API — manager/superadmin only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { parseOverviewRangeParam } from '@/lib/analytics/overview-range';
import { getLossAnalysisPayload, type LossOverTimeMode } from '@/lib/analytics/loss-analysis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  const q = req.query;
  const modeRaw = typeof q.lossOverTimeMode === 'string' ? q.lossOverTimeMode : '';
  const lossOverTimeMode: LossOverTimeMode = modeRaw === 'count' ? 'count' : 'rate';

  try {
    const payload = await getLossAnalysisPayload({
      global: parseOverviewRangeParam(typeof q.global === 'string' ? q.global : undefined),
      sectionLoss: parseOverviewRangeParam(
        typeof q.sectionLoss === 'string' ? q.sectionLoss : undefined,
      ),
      widgetLostByReason: parseOverviewRangeParam(
        typeof q.widgetLostByReason === 'string' ? q.widgetLostByReason : undefined,
      ),
      widgetStagesBeforeLoss: parseOverviewRangeParam(
        typeof q.widgetStagesBeforeLoss === 'string' ? q.widgetStagesBeforeLoss : undefined,
      ),
      widgetLossOverTime: parseOverviewRangeParam(
        typeof q.widgetLossOverTime === 'string' ? q.widgetLossOverTime : undefined,
      ),
      widgetLostBySource: parseOverviewRangeParam(
        typeof q.widgetLostBySource === 'string' ? q.widgetLostBySource : undefined,
      ),
      lossOverTimeMode,
    });
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load loss analytics';
    return sendError(res, message, 500);
  }
}
