/**
 * Single visit PATCH route — marks a visit as attended or failed.
 * When the lead is still in 'ziyaret', auto-advances funnel to ziyaret-etti or ziyaret-etmedi.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { resolveVisit } from '@/lib/leads/visit-ops';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateVisitSchema = z.object({
  status: z.enum(['attended', 'failed']),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid visit ID', 400);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const parsed = UpdateVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  const supabase = createServerSupabase(req, res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visit, error: fetchError } = await (supabase as any)
    .from('visits')
    .select('id, lead_uuid, status, leads(funnel_status, assigned_to)')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return sendError(res, 'Failed to fetch visit', 500);
  if (!visit) return sendError(res, 'Visit not found', 404);

  const leadRow = visit.leads as { funnel_status: string; assigned_to: string | null } | null;

  let updated;
  try {
    updated = await resolveVisit({
      visitId: id,
      visitLeadUuid: visit.lead_uuid,
      status: parsed.data.status,
      notes: parsed.data.notes,
      resolvedBy: session.userId,
      leadFunnelStatus: leadRow?.funnel_status ?? '',
      leadAssignedTo: leadRow?.assigned_to ?? null,
    });
  } catch {
    return sendError(res, 'Failed to update visit', 500);
  }

  return sendSuccess(res, updated);
}
