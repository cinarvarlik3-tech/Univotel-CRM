/**
 * Single lead GET, PATCH, and soft DELETE API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { FUNNEL_STATUSES, LANGUAGES, LOSS_REASONS, SPECIAL_STATES } from '@/lib/constants';
import { normalizePhone } from '@/lib/leads/normalize-phone';
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
    (data) =>
      data.funnel_status !== 'ziyaret-ama-almayacak' || data.loss_reason !== undefined,
    { message: 'loss_reason required for ziyaret-ama-almayacak status', path: ['loss_reason'] },
  );

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*, lead_details(*), salespeople:assigned_to(full_name, email)')
      .eq('uuid', id)
      .eq('is_deleted', false)
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

    const updates = { ...parsed.data };

    if (updates.parent_phone !== undefined && updates.parent_phone !== null) {
      const { phone } = normalizePhone(updates.parent_phone);
      updates.parent_phone = phone;
    }

    if (updates.assigned_to !== undefined && session.role !== 'manager') {
      return sendError(res, 'Only managers can reassign leads', 403);
    }

    const { data: existing } = await supabase
      .from('leads')
      .select('funnel_status')
      .eq('uuid', id)
      .maybeSingle();

    const { data: updated, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('uuid', id)
      .select('*')
      .maybeSingle();

    if (error) return sendError(res, 'Failed to update lead', 500);
    if (!updated) return sendError(res, 'Lead not found', 404);

    if (updates.funnel_status && updates.funnel_status !== existing?.funnel_status) {
      await supabase.from('contact_history').insert({
        lead_uuid: id,
        interaction_type: 'status_change',
        interaction_source: 'manual',
        funnel_status_at_time: updates.funnel_status,
        previous_status: existing?.funnel_status ?? null,
        status_changed: true,
        salesperson_id: session.userId,
        notes: `Status changed to ${updates.funnel_status}`,
      });
    }

    return sendSuccess(res, updated);
  }

  if (req.method === 'DELETE') {
    if (session.role !== 'manager') {
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
