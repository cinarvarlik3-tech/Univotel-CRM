/**
 * Quick stage advance — moves a lead to a new funnel status via the single chokepoint.
 * Writes lead_stage_history, resets auto-tasks, and syncs Chatwoot labels.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { FUNNEL_STATUSES } from '@/lib/constants';
import { updateLeadRecord } from '@/lib/leads/update-lead';
import { createServerSupabase } from '@/lib/supabase/server';

const AdvanceStageSchema = z.object({
  funnel_status: z.enum(FUNNEL_STATUSES),
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

  try {
    const result = await updateLeadRecord(
      id,
      { funnel_status: parsed.data.funnel_status },
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
