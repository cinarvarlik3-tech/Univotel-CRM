/**
 * Single lead GET, PATCH, and soft DELETE API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove, isSuperadmin, parseUserRole } from '@/lib/auth/roles';
import {
  FUNNEL_STATUSES,
  isFunnelAdvanceAllowed,
  LANGUAGES,
  LOSS_REASONS,
  SPECIAL_STATES,
} from '@/lib/constants';
import {
  applyLossReasonUpdate,
  getLossRecoveryFinancialTarget,
} from '@/lib/leads/apply-loss-reason-update';
import { executeLossRecoveryFinance } from '@/lib/finance/loss-recovery';
import { normalizePhone } from '@/lib/leads/normalize-phone';
import { updateLeadRecord } from '@/lib/leads/update-lead';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateLeadSchema = z.object({
  funnel_status: z.enum(FUNNEL_STATUSES).optional(),
  student_stage: z.string().optional(),
  persona_type: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
  loss_reason: z.enum(LOSS_REASONS).nullable().optional(),
  special_state: z.enum(SPECIAL_STATES).nullable().optional(),
  parent_phone: z.string().nullable().optional(),
  language: z.enum(LANGUAGES).optional(),
  lead_score: z.number().int().min(0).max(100).optional(),
  deal_awaiting: z.boolean().optional(),
  is_24h_restricted: z.boolean().optional(),
  has_moved_in: z.boolean().optional(),
  /** Human-edited display name (§1.1 / D12). Never overwrites auto_logged_name. */
  display_name: z.string().nullable().optional(),
  /** Required when clearing loss_reason back into a financial stage (0097 §D2). */
  purchased_room: z.string().uuid().optional(),
  move_in_month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM formatında olmalıdır')
    .optional(),
  deal_duration: z.number().int().min(1).max(12).optional(),
  discount: z.number().min(0).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    const session = await getSessionUser(req, res);
    if (!session) return sendError(res, 'Unauthorized', 401);

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*, lead_details(*), salespeople:assigned_to(full_name, email)')
      .eq('uuid', id)
      .eq('is_deleted', false)
      .eq('is_archived', false)
      .maybeSingle();

    if (error) return sendError(res, 'Failed to fetch lead', 500);
    if (!lead) return sendError(res, 'Lead not found', 404);

    return sendSuccess(res, lead);
  }

  if (req.method === 'PATCH') {
    const parsed = UpdateLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession) return sendError(res, 'Unauthorized', 401);

    const [{ data: salesperson }, { data: existing }] = await Promise.all([
      supabase
        .from('salespeople')
        .select('id, full_name, email, role')
        .eq('id', authSession.user.id)
        .maybeSingle(),
      supabase
        .from('leads')
        .select(
          'funnel_status, assigned_to, is_archived, loss_reason, funnel_status_before_lost, display_name, auto_logged_name, lead_name',
        )
        .eq('uuid', id)
        .maybeSingle(),
    ]);

    if (!salesperson) return sendError(res, 'Unauthorized', 401);
    const role = parseUserRole(salesperson.role);
    if (!role) return sendError(res, 'Unauthorized', 401);

    if (!existing) return sendError(res, 'Lead not found', 404);
    if (existing.is_archived) return sendError(res, 'Lead is archived', 409);

    const updates = { ...parsed.data };

    if (updates.parent_phone !== undefined && updates.parent_phone !== null) {
      const original = updates.parent_phone;
      const { phone, failed } = normalizePhone(original);
      updates.parent_phone = failed ? original : phone;
    }

    if (updates.assigned_to !== undefined && !isManagerOrAbove(role)) {
      return sendError(res, 'Only managers can reassign leads', 403);
    }

    // is_24h_restricted can only be cleared (set false) by superadmin.
    if (updates.is_24h_restricted === false && !isSuperadmin(role)) {
      return sendError(res, 'Only superadmin can clear 24h restriction', 403);
    }

    // has_moved_in can only be set true when funnel_status is sozlesme-imzalandi.
    const currentOrNewFunnel = updates.funnel_status ?? existing.funnel_status;
    if (updates.has_moved_in === true && currentOrNewFunnel !== 'sozlesme-imzalandi') {
      return sendError(res, 'has_moved_in can only be set when status is sozlesme-imzalandi', 400);
    }

    if (
      updates.funnel_status &&
      updates.funnel_status !== existing.funnel_status &&
      (updates.funnel_status === 'kapora-alindi' || updates.funnel_status === 'sozlesme-imzalandi')
    ) {
      return sendError(
        res,
        'Finans aşamalarına geçiş için /api/leads/[id]/advance-stage kullanılmalıdır',
        400,
      );
    }

    const lossRecoveryTarget = getLossRecoveryFinancialTarget(existing, updates);
    if (lossRecoveryTarget) {
      if (!updates.move_in_month) {
        return sendError(res, 'Kayıp geri alımında taşınma ayı (YYYY-MM) gereklidir', 400);
      }

      try {
        await executeLossRecoveryFinance({
          leadId: id,
          targetStatus: lossRecoveryTarget,
          actorId: authSession.user.id,
          input: {
            purchasedRoom: updates.purchased_room,
            moveInMonth: updates.move_in_month!,
            dealDuration: updates.deal_duration,
            discount: updates.discount,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Finans satırı oluşturulamadı';
        return sendError(res, message, 400);
      }
    }

    if (
      updates.funnel_status &&
      updates.funnel_status !== existing.funnel_status &&
      updates.funnel_status !== 'lost' &&
      !isFunnelAdvanceAllowed(existing.funnel_status, updates.funnel_status)
    ) {
      return sendError(res, 'Stage advance not allowed', 400);
    }

    let updated: Record<string, unknown>;
    const lossTransition = applyLossReasonUpdate(existing, updates);
    try {
      const result = await updateLeadRecord(
        id,
        updates as Record<string, unknown>,
        existing,
        authSession.user.id,
        'manual',
      );
      updated = result.lead;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return sendError(res, message, 500);
    }

    const funnelFromLossReason = lossTransition.funnel_status as string | undefined;

    // Rename activity log (D12): when display_name changes, write an Aktiviteler entry.
    if (updates.display_name !== undefined) {
      const oldName =
        (existing as Record<string, unknown>).display_name ??
        (existing as Record<string, unknown>).auto_logged_name ??
        (existing as Record<string, unknown>).lead_name ??
        '';
      const newName = updates.display_name ?? '';
      if (oldName !== newName) {
        void supabase.from('contact_history').insert({
          lead_uuid: id,
          interaction_type: 'activity',
          interaction_source: 'manual',
          status_changed: false,
          salesperson_id: authSession.user.id,
          notes: `${String(oldName)} → ${String(newName)} olarak yeniden adlandırıldı`,
        });
      }
    }

    if (updates.funnel_status && updates.funnel_status !== existing.funnel_status) {
      void supabase.from('contact_history').insert({
        lead_uuid: id,
        interaction_type: 'status_change',
        interaction_source: 'manual',
        funnel_status_at_time: updates.funnel_status,
        previous_status: existing.funnel_status ?? null,
        status_changed: true,
        salesperson_id: authSession.user.id,
        notes: `Aşama değişti: ${updates.funnel_status}`,
      });
    } else if (funnelFromLossReason && funnelFromLossReason !== existing.funnel_status) {
      void supabase.from('contact_history').insert({
        lead_uuid: id,
        interaction_type: 'status_change',
        interaction_source: 'manual',
        funnel_status_at_time: funnelFromLossReason,
        previous_status: existing.funnel_status ?? null,
        status_changed: true,
        salesperson_id: authSession.user.id,
        notes: `Status changed to ${funnelFromLossReason} (loss reason)`,
      });
    }

    return sendSuccess(res, updated);
  }

  if (req.method === 'DELETE') {
    const session = await getSessionUser(req, res);
    if (!session) return sendError(res, 'Unauthorized', 401);

    if (!isManagerOrAbove(session.role)) {
      return sendError(res, 'Only managers can delete leads', 403);
    }

    const { error } = await supabase
      .from('leads')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('uuid', id);

    if (error) return sendError(res, 'Failed to delete lead', 500);
    return sendSuccess(res, { deleted: true });
  }

  return sendError(res, 'Method not allowed', 405);
}
