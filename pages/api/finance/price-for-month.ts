/**
 * Resolves seasonal monthly price for kapora gate / UI discount cap.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isPartnerOperator } from '@/lib/auth/roles';
import { fetchPriceForMonth } from '@/lib/finance/resolve-price';
import { MOVE_IN_MONTH_RE } from '@/lib/finance/move-in-month';

const QuerySchema = z.object({
  roomTypeId: z.string().uuid(),
  moveInMonth: z.string().regex(MOVE_IN_MONTH_RE),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (isPartnerOperator(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return sendError(res, 'Invalid query', 400);

  try {
    const price = await fetchPriceForMonth(parsed.data.roomTypeId, parsed.data.moveInMonth);
    return sendSuccess(res, { price });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Price lookup failed';
    return sendError(res, message, 500);
  }
}
