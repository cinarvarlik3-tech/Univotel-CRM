/**
 * GET /api/leads/recent-searches — returns the current agent's last 10 recently-searched leads.
 * POST /api/leads/recent-searches — records a lead as recently searched (upserts with timestamp update).
 * Backed by `recent_searches` table with per-agent RLS. (D14, §1.3)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isPartnerOperator } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (isPartnerOperator(session.role)) return sendError(res, 'Forbidden', 403);

  const supabase = createServerSupabase(req, res);

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('recent_searches')
      .select('lead_uuid, leads!inner(lead_name, display_name, lead_phone)')
      .eq('agent_id', session.userId)
      .order('searched_at', { ascending: false })
      .limit(10);

    if (error) return sendError(res, 'Failed to fetch recent searches', 500);

    type LeadJoin = {
      lead_name: string | null;
      display_name: string | null;
      lead_phone: string | null;
    };
    const formatted = (data ?? []).map((row) => {
      // Supabase returns nested !inner joins as an array; take the first element.
      const leadsJoin = row.leads as LeadJoin | LeadJoin[] | null;
      const lead = Array.isArray(leadsJoin) ? leadsJoin[0] : leadsJoin;
      return {
        lead_uuid: row.lead_uuid,
        lead_name: lead?.lead_name ?? null,
        display_name: lead?.display_name ?? null,
        lead_phone: lead?.lead_phone ?? null,
      };
    });

    return sendSuccess(res, formatted);
  }

  if (req.method === 'POST') {
    const { lead_uuid } = req.body as { lead_uuid?: string };
    if (typeof lead_uuid !== 'string' || !lead_uuid) {
      return sendError(res, 'lead_uuid is required', 400);
    }

    // Upsert — update searched_at if already exists (trigger prunes to 10 most recent)
    const { error } = await supabase
      .from('recent_searches')
      .upsert(
        { agent_id: session.userId, lead_uuid, searched_at: new Date().toISOString() },
        { onConflict: 'agent_id,lead_uuid' },
      );
    if (error) return sendError(res, 'Failed to record recent search', 500);

    return sendSuccess(res, { recorded: true });
  }

  return sendError(res, 'Method not allowed', 405);
}
