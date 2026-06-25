/**
 * Everyday tab API — manager/superadmin only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { parseOverviewRangeParam } from '@/lib/analytics/overview-range';
import { getEverydayPayload } from '@/lib/analytics/everyday';
import type { ConversionStageDepth } from '@/lib/analytics/overview-shared';

const CONVERSION_STAGES: ConversionStageDepth[] = [
  'kapora-alindi',
  'sozlesme-imzalandi',
  'moved_in',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);

  const q = req.query;
  const conversionRaw = typeof q.conversionStage === 'string' ? q.conversionStage : '';
  const conversionStage = CONVERSION_STAGES.includes(conversionRaw as ConversionStageDepth)
    ? (conversionRaw as ConversionStageDepth)
    : 'sozlesme-imzalandi';

  try {
    const payload = await getEverydayPayload({
      global: parseOverviewRangeParam(typeof q.global === 'string' ? q.global : undefined),
      sectionTop: parseOverviewRangeParam(
        typeof q.sectionTop === 'string' ? q.sectionTop : undefined,
      ),
      sectionFunnel: parseOverviewRangeParam(
        typeof q.sectionFunnel === 'string' ? q.sectionFunnel : undefined,
      ),
      sectionActivity: parseOverviewRangeParam(
        typeof q.sectionActivity === 'string' ? q.sectionActivity : undefined,
      ),
      sectionVisits: parseOverviewRangeParam(
        typeof q.sectionVisits === 'string' ? q.sectionVisits : undefined,
      ),
      widgetMessages: parseOverviewRangeParam(
        typeof q.widgetMessages === 'string' ? q.widgetMessages : undefined,
      ),
      widgetCalls: parseOverviewRangeParam(
        typeof q.widgetCalls === 'string' ? q.widgetCalls : undefined,
      ),
      widgetVisitsTrend: parseOverviewRangeParam(
        typeof q.widgetVisitsTrend === 'string' ? q.widgetVisitsTrend : undefined,
      ),
      widgetFunnelByStage: parseOverviewRangeParam(
        typeof q.widgetFunnelByStage === 'string' ? q.widgetFunnelByStage : undefined,
      ),
      widgetMedianTimeInStage: parseOverviewRangeParam(
        typeof q.widgetMedianTimeInStage === 'string' ? q.widgetMedianTimeInStage : undefined,
      ),
      widgetVisitsByProperty: parseOverviewRangeParam(
        typeof q.widgetVisitsByProperty === 'string' ? q.widgetVisitsByProperty : undefined,
      ),
      conversionStage,
      messagesDirection:
        q.messagesDirection === 'incoming' || q.messagesDirection === 'outgoing'
          ? q.messagesDirection
          : 'both',
      visitsPropertyId:
        typeof q.visitsPropertyId === 'string' && q.visitsPropertyId.length > 0
          ? q.visitsPropertyId
          : 'all',
    });
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load everyday analytics';
    return sendError(res, message, 500);
  }
}
