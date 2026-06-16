/**
 * PMS unplaced worklist — leads with purchased_room and no active placement.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { getUnplacedLeads } from '@/lib/pms/queries';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const propertyId = typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined;
  const studentGender =
    typeof req.query.studentGender === 'string' ? req.query.studentGender : undefined;
  const schoolShortname =
    typeof req.query.schoolShortname === 'string' ? req.query.schoolShortname : undefined;

  try {
    const leads = await getUnplacedLeads({ propertyId, studentGender, schoolShortname });
    return sendSuccess(res, leads);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch unplaced leads';
    return sendError(res, message, 500);
  }
}
