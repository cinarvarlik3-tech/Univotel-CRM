/**
 * Global visits endpoint — GET (list with filters) + POST (schedule a visit).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { listVisits, scheduleVisit } from '@/lib/leads/visit-ops';
import { createServerSupabase } from '@/lib/supabase/server';

const ScheduleVisitSchema = z.object({
  lead_uuid: z.string().uuid(),
  property_id: z.string().uuid().optional().nullable(),
  scheduled_date: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    const { property_id, date_from, date_to, status } = req.query;

    const { data, error } = await listVisits({
      propertyId: typeof property_id === 'string' ? property_id : undefined,
      dateFrom: typeof date_from === 'string' ? date_from : undefined,
      dateTo: typeof date_to === 'string' ? date_to : undefined,
      status: typeof status === 'string' ? status : undefined,
      isManager: isManagerOrAbove(session.role),
      assignedToUserId: session.userId,
    });

    if (error) return sendError(res, 'Failed to fetch visits', 500);
    return sendSuccess(res, data ?? []);
  }

  if (req.method === 'POST') {
    const parsed = ScheduleVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const { lead_uuid, property_id, scheduled_date, notes } = parsed.data;

    // Verify lead access.
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('uuid, funnel_status, assigned_to')
      .eq('uuid', lead_uuid)
      .eq('is_archived', false)
      .eq('is_deleted', false)
      .maybeSingle();

    if (leadError) return sendError(res, 'Failed to fetch lead', 500);
    if (!lead) return sendError(res, 'Lead not found', 404);

    let visit;
    try {
      visit = await scheduleVisit({
        leadUuid: lead_uuid,
        propertyId: property_id ?? null,
        scheduledDate: scheduled_date,
        notes: notes ?? null,
        scheduledBy: session.userId,
        leadFunnelStatus: lead.funnel_status,
        leadAssignedTo: lead.assigned_to,
      });
    } catch {
      return sendError(res, 'Failed to schedule visit', 500);
    }

    return sendSuccess(res, visit);
  }

  return sendError(res, 'Method not allowed', 405);
}
