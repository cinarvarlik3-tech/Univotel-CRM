/**
 * POST proxy to queue a hotel recommendation request via Make.com webhook.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { env } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  const session = await getSessionUser(req, res);
  if (!session) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return sendError(res, 'Invalid lead ID', 400);
  }

  const supabase = createServerSupabase(req, res);

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('uuid')
    .eq('uuid', id)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .maybeSingle();

  if (leadError) {
    return sendError(res, 'Failed to queue recommendation', 500);
  }

  if (!lead) {
    return sendError(res, 'Lead not found', 404);
  }

  const { data: details, error: detailsError } = await supabase
    .from('lead_details')
    .select('student_gender, campus, budget_max, room_category, district_preference')
    .eq('lead_uuid', id)
    .maybeSingle();

  if (detailsError) {
    return sendError(res, 'Failed to queue recommendation', 500);
  }

  if (!details) {
    return sendError(
      res,
      'Missing required fields: student_gender, campus, budget, room_category',
      400,
    );
  }

  const gender = details.student_gender;
  if (
    (gender !== 'male' && gender !== 'female') ||
    !details.campus ||
    details.budget_max == null ||
    !details.room_category
  ) {
    return sendError(
      res,
      'Missing required fields: student_gender, campus, budget, room_category',
      400,
    );
  }

  try {
    const response = await fetch(env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: id,
        gender,
        campus: details.campus,
        budget: details.budget_max,
        room_category: details.room_category,
        district_preference: details.district_preference ?? null,
      }),
    });

    if (!response.ok) {
      return sendError(res, 'Failed to queue recommendation', 500);
    }

    return sendSuccess(res, { queued: true });
  } catch {
    return sendError(res, 'Failed to queue recommendation', 500);
  }
}
