/**
 * Lead claim endpoint — salesperson self-assigns an unassigned lead from the Lead Hub.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { claimLead } from '@/lib/leads/claim';
import { isChatwootAssigneeSyncEnabled } from '@/lib/env';
import { pushAssigneeToChatwoot } from '@/lib/leads/sync-assignee';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { id } = req.query;
  if (typeof id !== 'string') return sendError(res, 'Invalid lead ID', 400);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const supabase = createServerSupabase(req, res);
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('uuid, assigned_to, is_archived, is_deleted, deal_awaiting')
    .eq('uuid', id)
    .maybeSingle();

  if (fetchError) return sendError(res, 'Failed to fetch lead', 500);
  if (!lead) return sendError(res, 'Lead not found', 404);
  if (lead.is_deleted) return sendError(res, 'Lead not found', 404);
  if (lead.is_archived) return sendError(res, 'Lead is archived', 409);
  if (lead.deal_awaiting) return sendError(res, 'Lead is parked in deal awaiting', 400);
  if (lead.assigned_to !== null) return sendError(res, 'Lead already claimed', 409);

  let result;
  try {
    result = await claimLead(id, session.userId, session.salesperson.full_name);
  } catch {
    return sendError(res, 'Failed to claim lead', 500);
  }

  if (result.alreadyClaimed) return sendError(res, 'Lead already claimed', 409);

  if (isChatwootAssigneeSyncEnabled()) {
    void pushAssigneeToChatwoot(id, session.userId);
  }

  return sendSuccess(res, result.lead);
}
