/**
 * Pipeline board data endpoint — returns all matching leads (up to 500) for client-side grouping.
 * Shares the same filter/auth infrastructure as GET /api/leads but omits cursor pagination.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { applyEmbeddedFilters } from '@/lib/query/apply-embedded-filters';
import { applyFilters, parseFilterParams, validateFilters } from '@/lib/query/filter-builder';
import { requiresLeadDetailsJoin, splitFilters } from '@/lib/query/split-filters';
import { createServerSupabase } from '@/lib/supabase/server';

const PIPELINE_LIMIT = 500;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  const supabase = createServerSupabase(req, res);
  const mineOnly = req.query.mine === '1';
  const allFilters = parseFilterParams(req.query);
  const filterError = validateFilters(allFilters);

  if (filterError) return sendError(res, filterError.error, 400);

  const { leads: leadFilters, leadDetails: detailsFilters } = splitFilters(allFilters);
  const needsDetailsJoin = requiresLeadDetailsJoin(allFilters);

  const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const useFuzzy = req.query.fuzzy === '1' && searchTerm.length > 0;

  const selectClause = needsDetailsJoin
    ? '*, lead_details!inner(*), salespeople:assigned_to(full_name, email)'
    : '*, lead_details(*), salespeople:assigned_to(full_name, email)';

  let query = supabase
    .from('leads')
    .select(selectClause)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(PIPELINE_LIMIT);

  if (useFuzzy) {
    const { data: ids, error: rpcError } = await supabase.rpc('search_leads_ids', {
      search_term: searchTerm,
    });

    if (rpcError) return sendError(res, 'Failed to search leads', 500);

    const uuids = (ids ?? []).map((row: { lead_uuid: string }) => row.lead_uuid);

    if (uuids.length === 0) {
      return sendSuccess(res, { leads: [] });
    }

    query = query.in('uuid', uuids);
  } else if (searchTerm.length > 0) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`lead_name.ilike.${pattern},lead_phone.ilike.${pattern}`);
  }

  query = applyFilters(query, leadFilters);
  query = applyEmbeddedFilters(query, 'lead_details', detailsFilters);

  if (mineOnly) {
    query = query.eq('assigned_to', session.userId);
  }

  const { data, error } = await query;

  if (error) return sendError(res, 'Failed to fetch leads', 500);

  return sendSuccess(res, { leads: data ?? [] });
}
