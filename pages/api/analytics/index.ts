/**
 * Analytics dashboard API route — reads materialized views (manager-only).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  if (!isManagerOrAbove(session.role)) {
    return sendError(res, 'Forbidden', 403);
  }

  const supabase = createServerSupabase(req, res);

  const [bySource, funnel, agents, sla] = await Promise.all([
    supabase.from('mv_leads_by_source').select('*'),
    supabase.from('mv_funnel_distribution').select('*'),
    supabase.from('mv_agent_performance').select('*'),
    supabase.from('mv_sla_breach_rate').select('*'),
  ]);

  if (bySource.error || funnel.error || agents.error || sla.error) {
    return sendError(res, 'Failed to fetch analytics', 500);
  }

  return sendSuccess(res, {
    leadsBySource: bySource.data ?? [],
    funnelDistribution: funnel.data ?? [],
    agentPerformance: agents.data ?? [],
    slaBreachRate: sla.data ?? [],
  });
}
