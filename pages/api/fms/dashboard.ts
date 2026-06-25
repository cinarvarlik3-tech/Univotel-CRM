/**
 * FMS dashboard aggregated API — metrics, pie breakdown, and customer list.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import {
  getFmsCustomerList,
  getFmsMetricTriple,
  getFmsPieBreakdown,
  getFmsPropertyLookup,
  UNATTRIBUTED_PARTNER_ID,
  type FmsDashboardSelection,
} from '@/lib/finance/revenue';

function parseSelection(
  partnerId: string | undefined,
  propertyId: string | undefined,
  propertyPartnerId: string | null,
): FmsDashboardSelection {
  if (propertyId) {
    return { scope: 'property', propertyId, partnerId: propertyPartnerId };
  }
  if (partnerId === UNATTRIBUTED_PARTNER_ID) {
    return { scope: 'unattributed' };
  }
  if (partnerId) {
    return { scope: 'partner', partnerId };
  }
  return { scope: 'all' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const includeKapora = req.query.includeKapora === 'true';
  const partnerId =
    typeof req.query.partnerId === 'string' && req.query.partnerId.length > 0
      ? req.query.partnerId
      : undefined;
  const propertyId =
    typeof req.query.propertyId === 'string' && req.query.propertyId.length > 0
      ? req.query.propertyId
      : undefined;

  try {
    let propertyPartnerId: string | null = null;
    if (propertyId) {
      const properties = await getFmsPropertyLookup();
      propertyPartnerId = properties.find((p) => p.id === propertyId)?.partnerId ?? null;
    }

    const selection = parseSelection(partnerId, propertyId, propertyPartnerId);
    const [metrics, pie, customers] = await Promise.all([
      getFmsMetricTriple(selection, includeKapora),
      getFmsPieBreakdown(selection, includeKapora),
      getFmsCustomerList(selection, includeKapora),
    ]);

    return sendSuccess(res, { selection, metrics, pie, customers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch FMS dashboard';
    return sendError(res, message, 500);
  }
}
