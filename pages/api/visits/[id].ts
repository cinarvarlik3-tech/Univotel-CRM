/**
 * Single visit PATCH route — two modes:
 *  • Resolve: marks a visit attended/failed (auto-advances funnel when in 'ziyaret').
 *  • Reschedule: moves a visit's scheduled_date (calendar drag-and-drop).
 * Reschedule is restricted to managers or the lead's assigned salesperson.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { LOSS_REASONS } from '@/lib/constants';
import {
  hasVisitOccurred,
  recordVisitOutcome,
  rescheduleVisit,
  resolveVisit,
} from '@/lib/leads/visit-ops';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateVisitSchema = z.union([
  z.object({
    status: z.enum(['attended', 'failed']),
    notes: z.string().optional(),
  }),
  z.object({
    scheduled_date: z.string().min(1),
  }),
  z.object({
    outcome: z.enum(['decision_pending', 'downpayment', 'dropped']),
    loss_reason: z.enum(LOSS_REASONS).optional(),
    lead_uuid: z.string().uuid(),
    purchased_room: z.string().uuid().optional(),
  }),
]);

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
    .select('id, lead_uuid, status, scheduled_date, leads(funnel_status, assigned_to)')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return sendError(res, 'Failed to fetch visit', 500);
  if (!visit) return sendError(res, 'Visit not found', 404);

  const leadRow = visit.leads as { funnel_status: string; assigned_to: string | null } | null;

  // ── Visit outcome (Ziyaret Sonucu) ───────────────────────────────
  if ('outcome' in parsed.data) {
    if (parsed.data.outcome === 'dropped' && !parsed.data.loss_reason) {
      return sendError(res, 'Loss reason required', 400);
    }
    if (parsed.data.outcome === 'downpayment' && !parsed.data.purchased_room) {
      return sendError(res, 'Kapora için oda tipi seçilmelidir', 400);
    }

    const { data: leadFull, error: leadErr } = await supabase
      .from('leads')
      .select('funnel_status, assigned_to, loss_reason, funnel_status_before_lost')
      .eq('uuid', parsed.data.lead_uuid)
      .maybeSingle();

    if (leadErr || !leadFull) return sendError(res, 'Lead not found', 404);

    if (!hasVisitOccurred(visit.scheduled_date as string)) {
      return sendError(res, 'Visit has not occurred yet', 400);
    }

    let updated;
    try {
      updated = await recordVisitOutcome({
        visitId: id,
        visitLeadUuid: parsed.data.lead_uuid,
        outcome: parsed.data.outcome,
        lossReason: parsed.data.loss_reason,
        purchasedRoom: parsed.data.purchased_room,
        resolvedBy: session.userId,
        leadFunnelStatus: leadFull.funnel_status,
        leadAssignedTo: leadFull.assigned_to,
        existing: leadFull,
      });
    } catch {
      return sendError(res, 'Failed to record visit outcome', 500);
    }
    return sendSuccess(res, updated);
  }

  // ── Reschedule mode ──────────────────────────────────────────────
  if ('scheduled_date' in parsed.data) {
    const canEdit = isManagerOrAbove(session.role) || leadRow?.assigned_to === session.userId;
    if (!canEdit) return sendError(res, 'Forbidden', 403);

    let updated;
    try {
      updated = await rescheduleVisit({ visitId: id, scheduledDate: parsed.data.scheduled_date });
    } catch {
      return sendError(res, 'Failed to reschedule visit', 500);
    }
    return sendSuccess(res, updated);
  }

  // ── Resolve mode (attended / failed) ─────────────────────────────
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
