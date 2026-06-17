/**
 * My Day cockpit endpoint — six task container datasets for the "Bugün" tab.
 * Self-scoped to the requesting salesperson via session.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isPartnerOperator } from '@/lib/auth/roles';
import { getCockpitPayload } from '@/lib/my-day/cockpit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (isPartnerOperator(session.role)) return sendError(res, 'Forbidden', 403);

  try {
    const payload = await getCockpitPayload(
      session.userId,
      session.role,
      session.salesperson.full_name,
    );
    return sendSuccess(res, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load cockpit';
    return sendError(res, message, 500);
  }
}
