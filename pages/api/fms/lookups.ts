/**
 * FMS lookup API — partner and property lists for search bars.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { getFmsPartnerLookup, getFmsPropertyLookup } from '@/lib/finance/revenue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  try {
    const partnerFilter =
      typeof req.query.partnerId === 'string' && req.query.partnerId.length > 0
        ? req.query.partnerId
        : undefined;

    const [partners, properties] = await Promise.all([
      getFmsPartnerLookup(),
      getFmsPropertyLookup(partnerFilter),
    ]);

    return sendSuccess(res, { partners, properties });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch FMS lookups';
    return sendError(res, message, 500);
  }
}
