/**
 * Log a salesperson-initiated contact event on a lead.
 * Writes a contact_history row with salesperson_id = session user.
 * Powers "contacted today" compliance checks and activity volume metrics.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { MANUAL_INTERACTION_TYPES } from '@/lib/constants';
import { createServerSupabase } from '@/lib/supabase/server';
import { completeContactTasks } from '@/lib/tasks/auto-tasks';

const LogContactSchema = z.object({
  interaction_type: z.enum(MANUAL_INTERACTION_TYPES),
  interaction_source: z.string().optional(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const parsed = LogContactSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
  }

  const client = createServerSupabase(req, res);

  const { data: lead, error: leadError } = await client
    .from('leads')
    .select('uuid, funnel_status, is_deleted, is_archived')
    .eq('uuid', id)
    .maybeSingle();

  if (leadError) return sendError(res, 'Failed to fetch lead', 500);
  if (!lead || lead.is_deleted || lead.is_archived) return sendError(res, 'Lead not found', 404);

  const { data, error } = await client
    .from('contact_history')
    .insert({
      lead_uuid: id,
      interaction_type: parsed.data.interaction_type,
      interaction_source: parsed.data.interaction_source ?? 'manual',
      notes: parsed.data.notes ?? null,
      funnel_status_at_time: lead.funnel_status,
      status_changed: false,
      salesperson_id: session.userId,
    })
    .select('*')
    .single();

  if (error) return sendError(res, 'Failed to log contact', 500);

  // Bump last_contact_at so the last-contact sort and recency pill stay accurate.
  void client.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('uuid', id);

  // Auto-complete any pending nurture/post-visit reminder tasks for this lead.
  void completeContactTasks(id);

  return sendSuccess(res, data, 201);
}
