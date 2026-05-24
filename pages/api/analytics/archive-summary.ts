/**
 * Archive analytics summary API route — manager-only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { createServerSupabase } from '@/lib/supabase/server';
import type { ArchiveSummaryPayload } from '@/types/domain';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (session.role !== 'manager') return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const supabase = createServerSupabase(req, res);

  const [bySource, byAgent] = await Promise.all([
    supabase.from('mv_leads_by_source').select('*'),
    supabase.from('mv_agent_performance').select('*'),
  ]);

  if (bySource.error || byAgent.error) {
    return sendError(res, 'Failed to fetch archive summary', 500);
  }

  const sourceRows = bySource.data ?? [];
  const agentRows = byAgent.data ?? [];

  const totals = sourceRows.reduce(
    (acc, row) => ({
      won: acc.won + (row.won_count ?? 0),
      lost: acc.lost + (row.lost_count ?? 0),
      total: acc.total + (row.lead_count ?? 0),
    }),
    { won: 0, lost: 0, total: 0 },
  );

  const payload: ArchiveSummaryPayload = {
    totals,
    bySource: sourceRows.map((row) => ({
      lead_source: row.lead_source,
      won_count: row.won_count,
      lost_count: row.lost_count,
      conversion_rate: row.conversion_rate,
    })),
    byAgent: agentRows.map((row) => ({
      salesperson_id: row.salesperson_id,
      full_name: row.full_name,
      won_count: row.won_count,
      lost_count: row.lost_count,
      conversion_rate: row.conversion_rate,
    })),
  };

  return sendSuccess(res, payload);
}
