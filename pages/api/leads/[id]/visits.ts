/**
 * Visits list and create API route for a specific lead.
 * POST auto-advances funnel to 'ziyaret' when lead is pre-visit.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { scheduleVisit } from '@/lib/leads/visit-ops';
import { createServerSupabase } from '@/lib/supabase/server';

const CreateVisitSchema = z.object({
  property_id: z.string().uuid(),
  scheduled_date: z.string().datetime(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('visits')
      .select('*')
      .eq('lead_uuid', id)
      .order('scheduled_date', { ascending: false });

    if (error) return sendError(res, 'Failed to fetch visits', 500);
    return sendSuccess(res, data ?? []);
  }

  if (req.method === 'POST') {
    const parsed = CreateVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('uuid, funnel_status, assigned_to, is_archived, is_deleted')
      .eq('uuid', id)
      .maybeSingle();

    if (leadError) return sendError(res, 'Failed to fetch lead', 500);
    if (!lead) return sendError(res, 'Lead not found', 404);
    if (lead.is_deleted) return sendError(res, 'Lead not found', 404);
    if (lead.is_archived) return sendError(res, 'Lead is archived', 409);

    let visit;
    try {
      visit = await scheduleVisit({
        leadUuid: id,
        propertyId: parsed.data.property_id,
        scheduledDate: parsed.data.scheduled_date,
        notes: parsed.data.notes ?? null,
        scheduledBy: session.userId,
        leadFunnelStatus: lead.funnel_status,
        leadAssignedTo: lead.assigned_to,
      });
    } catch {
      return sendError(res, 'Failed to create visit', 500);
    }

    return sendSuccess(res, visit, 201);
  }

  return sendError(res, 'Method not allowed', 405);
}
