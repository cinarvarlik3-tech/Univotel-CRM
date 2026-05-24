/**
 * Old lead detail API route — manager/superadmin, read-only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const { uuid } = req.query;
  if (typeof uuid !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const supabase = createServerSupabase(req, res);

  const { data, error } = await supabase
    .from('old_leads')
    .select(
      'uuid, lead_name, lead_phone, lead_source, message_from, funnel_status, student_stage, language, lead_score, created_at, updated_at, last_contact_at, chatwoot_conversation_id, chatwoot_contact_id, source_details, salespeople:assigned_to(full_name, email), old_lead_details(*)',
    )
    .eq('uuid', uuid)
    .maybeSingle();

  if (error) return sendError(res, 'Failed to fetch old lead', 500);
  if (!data) return sendError(res, 'Old lead not found', 404);

  return sendSuccess(res, { oldLead: data });
}
