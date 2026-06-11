/**
 * Lead details GET and PATCH API route.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { hasCustomAttrMappedDetailUpdates } from '@/lib/chatwoot/sync-custom-attributes';
import { hasLabelMappedDetailUpdates, pushLabelsToChatwoot } from '@/lib/chatwoot/sync-labels';
import { pushCustomAttributesToChatwoot } from '@/lib/chatwoot/push-custom-attributes';
import { BUDGET_TIERS, DORM_AWAITING_VALUES, UNI_YEARS } from '@/lib/constants';
import { isChatwootLabelSyncEnabled } from '@/lib/env';
import { applyLeadFlagsFromDetails } from '@/lib/leads/update-lead';
import { budgetTierWritePayload } from '@/lib/leads/budget-tier';
import { createServerSupabase } from '@/lib/supabase/server';

const UpdateLeadDetailsSchema = z.object({
  university: z.string().nullable().optional(),
  budget_tier: z.enum(BUDGET_TIERS).nullable().optional(),
  move_in: z.string().nullable().optional(),
  actual_move_in_date: z.string().nullable().optional(),
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
  school_shortname: z.string().nullable().optional(),
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

    const patch = { ...parsed.data } as Record<string, unknown>;
    if ('budget_tier' in patch) {
      Object.assign(patch, budgetTierWritePayload(patch.budget_tier as string | null | undefined));
    }

    // Fetch current lead to check funnel_status for move_in_date_set gating.
    const { data: leadRow } = await supabase
      .from('leads')
      .select('funnel_status')
      .eq('uuid', leadId)
      .maybeSingle();

    const moveInDateCapableStatuses = new Set(['kapora-alindi', 'sozlesme-imzalandi']);
    const canSetMoveInDate = leadRow && moveInDateCapableStatuses.has(leadRow.funnel_status);

    const { data, error } = await supabase
      .from('lead_details')
      .update(patch)
      .eq('lead_uuid', leadId)
      .select('*')
      .maybeSingle();

    if (error) return sendError(res, 'Failed to update lead details', 500);
    if (!data) return sendError(res, 'Lead details not found', 404);

    // Propagate actual_move_in_date → has_moved_in and move_in → move_in_date_set.
    void applyLeadFlagsFromDetails(leadId, parsed.data, canSetMoveInDate ?? false);

    if (isChatwootLabelSyncEnabled()) {
      if (hasLabelMappedDetailUpdates(parsed.data)) {
        void pushLabelsToChatwoot(leadId);
      }
      if (hasCustomAttrMappedDetailUpdates(parsed.data)) {
        void pushCustomAttributesToChatwoot(leadId);
      }
    }

    return sendSuccess(res, data);
  }

  return sendError(res, 'Method not allowed', 405);
}
