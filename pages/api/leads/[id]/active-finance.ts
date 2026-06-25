/**
 * Active finance row for a lead (manager read — for sözleşme confirm pre-fill).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isPartnerOperator } from '@/lib/auth/roles';
import { getActiveFinanceForLead } from '@/lib/finance/get-active-finance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (isPartnerOperator(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  try {
    const data = await getActiveFinanceForLead(id);
    return sendSuccess(res, data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch finance';
    return sendError(res, message, 500);
  }
}
