/**
 * Contact history GET and POST API route for a lead.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';

const CreateContactSchema = z.object({
  notes: z.string().min(1),
  interaction_type: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const { leadId } = req.query;
  if (typeof leadId !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('contact_history')
      .select('*')
      .eq('lead_uuid', leadId)
      .order('created_at', { ascending: false });

    if (error) return sendError(res, 'Failed to fetch contact history', 500);
    return sendSuccess(res, data ?? []);
  }

  if (req.method === 'POST') {
    const parsed = CreateContactSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('funnel_status, is_archived')
      .eq('uuid', leadId)
      .maybeSingle();

    if (!lead) return sendError(res, 'Lead not found', 404);
    if (lead.is_archived) return sendError(res, 'Lead is archived', 409);

    const { data, error } = await supabase
      .from('contact_history')
      .insert({
        lead_uuid: leadId,
        interaction_type: parsed.data.interaction_type ?? 'message_sent',
        interaction_source: 'manual',
        funnel_status_at_time: lead?.funnel_status ?? null,
        salesperson_id: session.userId,
        notes: parsed.data.notes,
      })
      .select('*')
      .single();

    if (error) return sendError(res, 'Failed to add contact history', 500);

    await supabase
      .from('leads')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('uuid', leadId);

    return sendSuccess(res, data, 201);
  }

  return sendError(res, 'Method not allowed', 405);
}
