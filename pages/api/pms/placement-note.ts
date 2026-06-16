/**
 * PMS placement note — update lead_details.placement_note (Operator+).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { requireOperatorWrite } from '@/lib/auth/roles';
import { updatePlacementNote } from '@/lib/pms/placement-ops';

const BodySchema = z.object({
  leadId: z.string().uuid(),
  note: z.string().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return sendError(res, 'Method not allowed', 405);

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
    await updatePlacementNote({ leadId: parsed.data.leadId, note: parsed.data.note });
    return sendSuccess(res, { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update note failed';
    return sendError(res, message, 500);
  }
}
