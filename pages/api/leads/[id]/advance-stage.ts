/**
 * Quick stage advance — moves a lead to a new funnel status via the single chokepoint.
 * Writes lead_stage_history, resets auto-tasks, and syncs Chatwoot labels.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isPartnerOperator } from '@/lib/auth/roles';
import { FUNNEL_STATUSES, isFunnelAdvanceAllowed, purchasedRoomAdvanceMode } from '@/lib/constants';
import { advanceToKapora, confirmSozlesme } from '@/lib/finance/kapora-flow';
import { resolvePurchasedRoomForAdvance, setPurchasedRoom } from '@/lib/pms/purchased-room';
import { updateLeadRecord } from '@/lib/leads/update-lead';
import { createServerSupabase } from '@/lib/supabase/server';

const AdvanceStageSchema = z.object({
  funnel_status: z.enum(FUNNEL_STATUSES),
  purchased_room: z.string().uuid().optional(),
  move_in_month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  deal_duration: z.number().int().min(1).max(12).optional(),
  discount: z.number().min(0).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const parsed = AdvanceStageSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  const client = createServerSupabase(req, res);

  const { data: existing, error: fetchError } = await client
    .from('leads')
    .select(
      'funnel_status, assigned_to, is_archived, is_deleted, loss_reason, funnel_status_before_lost',
    )
    .eq('uuid', id)
    .maybeSingle();

  if (fetchError) return sendError(res, 'Failed to fetch lead', 500);
  if (!existing || existing.is_deleted) return sendError(res, 'Lead not found', 404);
  if (existing.is_archived) return sendError(res, 'Lead is archived', 409);
  if (parsed.data.funnel_status === existing.funnel_status) {
    return sendError(res, 'Lead is already in that stage', 409);
  }
  if (isPartnerOperator(session.role) && parsed.data.funnel_status === 'lost') {
    return sendError(res, 'PARTNER_FORBIDDEN: cannot mark lead as lost', 403);
  }
  if (
    parsed.data.funnel_status !== 'lost' &&
    !isFunnelAdvanceAllowed(existing.funnel_status, parsed.data.funnel_status)
  ) {
    return sendError(res, 'Stage advance not allowed', 400);
  }

  try {
    const roomMode = purchasedRoomAdvanceMode(existing.funnel_status, parsed.data.funnel_status);
    const targetStatus = parsed.data.funnel_status;

    if (targetStatus === 'sozlesme-imzalandi' && existing.funnel_status !== 'kapora-alindi') {
      return sendError(
        res,
        'Sözleşme aşamasına geçiş için önce kapora alınmalı ve /api/leads/[id]/advance-stage kullanılmalıdır',
        400,
      );
    }

    if (targetStatus === 'kapora-alindi') {
      let purchasedRoom = parsed.data.purchased_room;
      if (!purchasedRoom) {
        purchasedRoom =
          (await resolvePurchasedRoomForAdvance({
            leadId: id,
            fromStatus: existing.funnel_status,
            toStatus: targetStatus,
            purchasedRoom: parsed.data.purchased_room,
          })) ?? undefined;
      }
      if (!purchasedRoom) {
        return sendError(res, 'Kapora için oda tipi seçilmelidir', 400);
      }
      if (!parsed.data.move_in_month) {
        return sendError(res, 'Taşınma ayı (YYYY-MM) gereklidir', 400);
      }

      const result = await advanceToKapora({
        leadId: id,
        purchasedRoom,
        moveInMonth: parsed.data.move_in_month,
        dealDuration: parsed.data.deal_duration,
        discount: parsed.data.discount,
        actorId: session.userId,
        existing,
      });
      return sendSuccess(res, result.lead);
    }

    if (
      roomMode === 'confirm' &&
      targetStatus === 'sozlesme-imzalandi' &&
      existing.funnel_status === 'kapora-alindi'
    ) {
      let purchasedRoom = parsed.data.purchased_room;
      if (!purchasedRoom) {
        purchasedRoom =
          (await resolvePurchasedRoomForAdvance({
            leadId: id,
            fromStatus: existing.funnel_status,
            toStatus: targetStatus,
            purchasedRoom: parsed.data.purchased_room,
          })) ?? undefined;
      }
      if (!purchasedRoom) {
        return sendError(res, 'Sözleşme için oda tipi onaylanmalıdır', 400);
      }
      if (!parsed.data.move_in_month) {
        return sendError(res, 'Taşınma ayı (YYYY-MM) gereklidir', 400);
      }

      const result = await confirmSozlesme({
        leadId: id,
        purchasedRoom,
        moveInMonth: parsed.data.move_in_month,
        dealDuration: parsed.data.deal_duration,
        discount: parsed.data.discount,
        actorId: session.userId,
        existing,
      });
      return sendSuccess(res, result.lead);
    }

    if (roomMode) {
      if (parsed.data.purchased_room) {
        await setPurchasedRoom({ leadId: id, roomTypeId: parsed.data.purchased_room });
      } else {
        await resolvePurchasedRoomForAdvance({
          leadId: id,
          fromStatus: existing.funnel_status,
          toStatus: targetStatus,
        });
      }
    }

    const result = await updateLeadRecord(
      id,
      { funnel_status: targetStatus },
      existing,
      session.userId,
      'manual',
    );
    return sendSuccess(res, result.lead);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Advance stage failed';
    return sendError(res, message, 500);
  }
}
