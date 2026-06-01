/**
 * Lead details GET and PATCH API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { hasLabelMappedDetailUpdates, pushLabelsToChatwoot } from '@/lib/chatwoot/sync-labels';
import { DORM_AWAITING_VALUES, UNI_YEARS } from '@/lib/constants';
import { isChatwootLabelSyncEnabled } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateLeadDetailsSchema = z.object({
  university: z.string().nullable().optional(),
  budget_min: z.number().nullable().optional(),
  budget_max: z.number().nullable().optional(),
  move_in: z.string().nullable().optional(),
  uni_year: z.enum(UNI_YEARS).nullable().optional(),
  parent_name: z.string().nullable().optional(),
  preferred_district: z.string().nullable().optional(),
  student_gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  nationality: z.string().nullable().optional(),
  interested_hotel: z.array(z.string()).optional(),
  room_type: z.array(z.string()).optional(),
  dorm_awaiting: z.array(z.enum(DORM_AWAITING_VALUES)).optional(),
  kvkk_opt_in: z.boolean().nullable().optional(),
  marketing_opt_in: z.boolean().nullable().optional(),
  campus: z.string().nullable().optional(),
  room_category: z.enum(['single', 'double', 'triple', 'quad']).nullable().optional(),
  district_preference: z.string().nullable().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const { leadId } = req.query;
  if (typeof leadId !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);
  const detailsTable = isManagerOrAbove(session.role) ? 'lead_details' : 'lead_details_safe';

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from(detailsTable)
      .select('*')
      .eq('lead_uuid', leadId)
      .maybeSingle();

    if (error) return sendError(res, 'Failed to fetch lead details', 500);
    if (!data) return sendError(res, 'Lead details not found', 404);

    return sendSuccess(res, data);
  }

  if (req.method === 'PATCH') {
    const parsed = UpdateLeadDetailsSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const { data, error } = await supabase
      .from('lead_details')
      .update(parsed.data)
      .eq('lead_uuid', leadId)
      .select('*')
      .maybeSingle();

    if (error) return sendError(res, 'Failed to update lead details', 500);
    if (!data) return sendError(res, 'Lead details not found', 404);

    if (isChatwootLabelSyncEnabled() && hasLabelMappedDetailUpdates(parsed.data)) {
      await pushLabelsToChatwoot(leadId);
    }

    return sendSuccess(res, data);
  }

  return sendError(res, 'Method not allowed', 405);
}
