/**
 * FMS dashboard totals API.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { getFmsTotals } from '@/lib/finance/revenue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  try {
    const includeKapora = req.query.includeKapora === 'true';
    const data = await getFmsTotals(includeKapora);
    return sendSuccess(res, data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch FMS totals';
    return sendError(res, message, 500);
  }
}
