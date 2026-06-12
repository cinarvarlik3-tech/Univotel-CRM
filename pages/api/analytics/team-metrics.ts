/**
 * GET /api/analytics/team-metrics — team panel metrics via SQL aggregation RPC (D25, §6.2).
 * Uses `get_team_panel_metrics(date_from, date_to)` SECURITY DEFINER function for efficient
 * per-agent Volume / Outcomes / Conversions / Stale metrics without in-memory paging limits.
 * Manager/superadmin only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { resolveManagerPanelRange } from '@/lib/analytics/manager-panel';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (!isManagerOrAbove(session.role)) {
    return sendError(res, 'Forbidden', 403);
  }

  const { range } = req.query;
  const dateRange = resolveManagerPanelRange(typeof range === 'string' ? range : undefined);

  const supabase = createServerSupabase(req, res);
  const { data, error } = await supabase.rpc('get_team_panel_metrics', {
    date_from: dateRange.from.toISOString(),
    date_to: dateRange.to.toISOString(),
  });

  if (error) return sendError(res, `RPC failed: ${error.message}`, 500);

  return sendSuccess(res, data ?? []);
}
