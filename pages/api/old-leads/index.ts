/**
 * Old leads list API route — manager/superadmin, cursor pagination, dynamic filters.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { OLD_FILTERABLE_COLUMNS, OLD_SORTABLE_COLUMNS } from '@/lib/constants';
import { applyEmbeddedFilters } from '@/lib/query/apply-embedded-filters';
import {
  applyOldLeadRecHotelComposite,
  parseCompositeFilterFlags,
} from '@/lib/query/apply-composite-filters';
import { applyFilters, parseFilterParams, validateFilters } from '@/lib/query/filter-builder';
import { buildCursorResponse, parseCursorParams } from '@/lib/query/cursor';
import { requiresOldLeadDetailsJoin, splitOldFilters } from '@/lib/query/split-old-filters';
import { createServerSupabase } from '@/lib/supabase/server';

const OLD_LEAD_LIST_SELECT =
  'uuid, lead_name, lead_phone, lead_source, message_from, funnel_status, student_stage, created_at, last_contact_at, chatwoot_conversation_id, salespeople:assigned_to(full_name, email), old_lead_details(university, uni_year, student_gender)';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);
  if (!isManagerOrAbove(session.role)) return sendError(res, 'Forbidden', 403);
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const supabase = createServerSupabase(req, res);
  const { cursor, limit } = parseCursorParams(req.query);
  const allFilters = parseFilterParams(req.query);
  const filterError = validateFilters(allFilters, OLD_FILTERABLE_COLUMNS);
  const compositeFlags = parseCompositeFilterFlags(req.query);

  if (filterError) return sendError(res, filterError.error, 400);

  const { oldLeads: tableFilters, oldLeadDetails: detailsFilters } = splitOldFilters(allFilters);
  const needsDetailsJoin =
    requiresOldLeadDetailsJoin(allFilters) ||
    compositeFlags.oldRecHotelPresent === true ||
    compositeFlags.oldRecHotelAbsent === true;

  const sortField =
    typeof req.query.sort === 'string' && OLD_SORTABLE_COLUMNS.has(req.query.sort)
      ? req.query.sort
      : 'created_at';

  const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const useFuzzy = req.query.fuzzy === '1' && searchTerm.length > 0;

  const selectClause = needsDetailsJoin
    ? OLD_LEAD_LIST_SELECT.replace('old_lead_details(', 'old_lead_details!inner(')
    : OLD_LEAD_LIST_SELECT;

  let query = supabase
    .from('old_leads')
    .select(selectClause)
    .order(sortField, { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt(sortField, cursor);
  }

  if (useFuzzy) {
    const { data: ids, error: rpcError } = await supabase.rpc('search_old_leads_ids', {
      search_term: searchTerm,
    });

    if (rpcError) return sendError(res, 'Failed to search old leads', 500);

    const uuids = (ids ?? []).map((row: { lead_uuid: string }) => row.lead_uuid);

    if (uuids.length === 0) {
      return sendSuccess(res, { oldLeads: [], nextCursor: null });
    }

    query = query.in('uuid', uuids);
  } else if (searchTerm.length > 0) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`lead_name.ilike.${pattern},lead_phone.ilike.${pattern}`);
  }

  query = applyFilters(query, tableFilters);
  query = applyEmbeddedFilters(query, 'old_lead_details', detailsFilters);
  query = applyOldLeadRecHotelComposite(query, 'old_lead_details', compositeFlags);

  const { data, error } = await query;
  if (error) return sendError(res, 'Failed to fetch old leads', 500);

  const { data: rows, nextCursor } = buildCursorResponse(
    (data ?? []) as unknown as Record<string, unknown>[],
    limit,
    sortField,
  );

  return sendSuccess(res, { oldLeads: rows, nextCursor });
}
