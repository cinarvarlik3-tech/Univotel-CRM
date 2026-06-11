/**
 * Manager panel API — team salesperson metrics + general trend data (manager/superadmin only).
 *
 * Query params:
 *   range: 'this_week' | 'this_month' | 'last_30_days'  (default: this_month)
 *   salesperson: salesperson UUID — scopes summary KPIs + trend charts
 *                (team table always covers everyone)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { getManagerPanelPayload, resolveManagerPanelRange } from '@/lib/analytics/manager-panel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (!isManagerOrAbove(session.role)) {
    return sendError(res, 'Forbidden', 403);
  }

  const { range, salesperson } = req.query;
  const dateRange = resolveManagerPanelRange(typeof range === 'string' ? range : undefined);
  const salespersonId =
    typeof salesperson === 'string' && salesperson.length > 0 ? salesperson : undefined;

  try {
    const payload = await getManagerPanelPayload(dateRange, salespersonId);
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load manager panel';
    return sendError(res, message, 500);
  }
}
