/**
 * PMS place — insert active lead_rooms row (Operator+).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { requireOperatorWrite } from '@/lib/auth/roles';
import { placeLead, PmsPlacementError } from '@/lib/pms/placement-ops';

const BodySchema = z.object({
  leadId: z.string().uuid(),
  roomId: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  try {
    requireOperatorWrite(session.role);
  } catch {
    return sendError(res, 'Forbidden', 403);
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await placeLead({
      leadId: parsed.data.leadId,
      roomId: parsed.data.roomId,
      placedBy: session.userId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    if (err instanceof PmsPlacementError) {
      return sendError(res, err.message, err.status);
    }
    const message = err instanceof Error ? err.message : 'Place failed';
    return sendError(res, message, 500);
  }
}
