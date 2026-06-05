/**
 * Single lead GET, PATCH, and soft DELETE API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove, parseUserRole } from '@/lib/auth/roles';
import { FUNNEL_STATUSES, LANGUAGES, LOSS_REASONS, SPECIAL_STATES } from '@/lib/constants';
import { normalizePhone } from '@/lib/leads/normalize-phone';
import { updateLeadRecord } from '@/lib/leads/update-lead';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateLeadSchema = z
  .object({
    funnel_status: z.enum(FUNNEL_STATUSES).optional(),
    student_stage: z.string().optional(),
    persona_type: z.string().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
    loss_reason: z.enum(LOSS_REASONS).optional(),
    special_state: z.enum(SPECIAL_STATES).nullable().optional(),
    parent_phone: z.string().nullable().optional(),
    language: z.enum(LANGUAGES).optional(),
    lead_score: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (data) => data.funnel_status !== 'ziyaret-ama-almayacak' || data.loss_reason !== undefined,
    { message: 'loss_reason required for ziyaret-ama-almayacak status', path: ['loss_reason'] },
  );

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
        .select('funnel_status, assigned_to, is_archived')
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

    let updated: Record<string, unknown>;
    try {
      const result = await updateLeadRecord(id, updates as Record<string, unknown>, existing);
      updated = result.lead;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return sendError(res, message, 500);
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
        notes: `Status changed to ${updates.funnel_status}`,
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
