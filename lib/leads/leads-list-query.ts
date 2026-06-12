/**
 * Shared leads list query parsing, filter application, and count helpers for GET /api/leads.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser } from '@/lib/auth/get-session-user';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { SORTABLE_COLUMNS } from '@/lib/constants';
import { applyEmbeddedFilters } from '@/lib/query/apply-embedded-filters';
import {
  applyFilters,
  parseFilterParams,
  validateFilters,
  type FilterCondition,
  type FilterError,
} from '@/lib/query/filter-builder';
import { requiresLeadDetailsJoin, splitFilters } from '@/lib/query/split-filters';
import type { Database } from '@/types/database';

/** Parsed GET /api/leads query parameters. */
export interface LeadsListParams {
  mineOnly: boolean;
  allFilters: FilterCondition[];
  leadFilters: FilterCondition[];
  detailsFilters: FilterCondition[];
  needsDetailsJoin: boolean;
  sortField: string;
  /** Sort direction — 'asc' for "En son temas" (furthest-past-first, nulls first), 'desc' default. */
  sortDir: 'asc' | 'desc';
  searchTerm: string;
  useFuzzy: boolean;
  dealAwaitingFilterSet: boolean;
  assigneeId: string;
  /** When true (manager+ only), includes irrelevant leads (lost, sozlesme-imzalandi, moved-in, 24h-restricted). */
  showAll: boolean;
  /** When true, returns only unassigned leads (assigned_to IS NULL). Used for Lead Hub. */
  unassignedOnly: boolean;
}

/** Aggregate counts for leads list KPI cards. */
export interface LeadsListCounts {
  total: number;
  breached: number;
  onTime: number;
}

type LeadsClient = SupabaseClient<Database>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeadsQuery = any;

/**
 * Parses and validates leads list query params from a Next.js API request.
 * @param query - Request query record.
 * @param session - Authenticated session user.
 * @returns Parsed params or a validation error.
 */
export function parseLeadsListParams(
  query: Record<string, string | string[] | undefined>,
  session: SessionUser,
): LeadsListParams | FilterError {
  const allFilters = parseFilterParams(query);
  const filterError = validateFilters(allFilters);
  if (filterError) return filterError;

  const { leads: leadFilters, leadDetails: detailsFilters } = splitFilters(allFilters);

  const sortField =
    typeof query.sort === 'string' && SORTABLE_COLUMNS.has(query.sort) ? query.sort : 'created_at';

  const sortDir: 'asc' | 'desc' = query.sort_dir === 'asc' ? 'asc' : 'desc';

  const searchTerm = typeof query.search === 'string' ? query.search.trim() : '';
  // allow show_all for managers, or for salespeople viewing their own leads (mine=1).
  const showAll = query.show_all === '1' && (isManagerOrAbove(session.role) || query.mine === '1');

  return {
    mineOnly: query.mine === '1',
    allFilters,
    leadFilters,
    detailsFilters,
    needsDetailsJoin: requiresLeadDetailsJoin(allFilters),
    sortField,
    sortDir,
    searchTerm,
    useFuzzy: query.fuzzy === '1' && searchTerm.length > 0,
    dealAwaitingFilterSet: allFilters.some((f) => f.field === 'deal_awaiting'),
    assigneeId: session.userId,
    showAll,
    unassignedOnly: query.unassigned === '1',
  };
}

/**
 * Resolves lead UUIDs for fuzzy search, or null when search is not active.
 * @param client - Supabase client.
 * @param params - Parsed list params.
 * @returns Matching UUIDs, empty array when no matches, or null when search is off.
 */
export async function resolveLeadsListSearchUuids(
  client: LeadsClient,
  params: LeadsListParams,
): Promise<string[] | null> {
  if (params.useFuzzy) {
    const { data: ids, error } = await client.rpc('search_leads_ids', {
      search_term: params.searchTerm,
    });
    if (error) throw new Error(`Lead search failed: ${error.message}`);
    return (ids ?? []).map((row: { lead_uuid: string }) => row.lead_uuid);
  }

  return null;
}

/**
 * Applies shared list filters to a leads query builder.
 * @param query - Base Supabase query.
 * @param params - Parsed list params.
 * @param searchUuids - Fuzzy-search UUID allowlist; omit for ilike search / no search.
 */
export function applyLeadsListFilters(
  query: LeadsQuery,
  params: LeadsListParams,
  searchUuids?: string[] | null,
): LeadsQuery {
  let result = query.eq('is_deleted', false).eq('is_archived', false);

  if (!params.mineOnly && !params.dealAwaitingFilterSet) {
    result = result.eq('deal_awaiting', false);
  }

  if (!params.showAll) {
    result = result
      .not('funnel_status', 'in', '("lost","sozlesme-imzalandi")')
      .eq('has_moved_in', false)
      .eq('is_24h_restricted', false);
  }

  if (searchUuids !== undefined && searchUuids !== null) {
    result = result.in('uuid', searchUuids);
  } else if (params.searchTerm.length > 0) {
    const pattern = `%${params.searchTerm}%`;
    result = result.or(`lead_name.ilike.${pattern},lead_phone.ilike.${pattern}`);
  }

  result = applyFilters(result, params.leadFilters);
  result = applyEmbeddedFilters(result, 'lead_details', params.detailsFilters);

  if (params.mineOnly) {
    result = result.eq('assigned_to', params.assigneeId);
  }

  if (params.unassignedOnly) {
    result = result.is('assigned_to', null);
  }

  return result;
}

/**
 * Counts leads matching list filters.
 * @param client - Supabase client.
 * @param params - Parsed list params.
 * @param searchUuids - Fuzzy-search UUID allowlist; pass [] for zero matches.
 * @param slaStatus - Optional SLA status filter for KPI breakdown.
 */
export async function countLeadsList(
  client: LeadsClient,
  params: LeadsListParams,
  searchUuids: string[] | null | undefined,
  slaStatus?: 'breached' | 'on_time',
): Promise<number> {
  if (searchUuids !== undefined && searchUuids !== null && searchUuids.length === 0) {
    return 0;
  }

  const selectClause = params.needsDetailsJoin ? 'uuid, lead_details!inner(lead_uuid)' : 'uuid';

  let query = client.from('leads').select(selectClause, { count: 'exact', head: true });
  query = applyLeadsListFilters(query, params, searchUuids);

  if (slaStatus) {
    query = query.eq('sla_status', slaStatus);
  }

  const { count, error } = await query;
  if (error) throw new Error(`Lead count failed: ${error.message}`);
  return count ?? 0;
}

/**
 * Returns total, breached, and on-time counts for a leads list query in parallel.
 */
export async function countLeadsListKpis(
  client: LeadsClient,
  params: LeadsListParams,
  searchUuids: string[] | null | undefined,
): Promise<LeadsListCounts> {
  const [total, breached, onTime] = await Promise.all([
    countLeadsList(client, params, searchUuids),
    countLeadsList(client, params, searchUuids, 'breached'),
    countLeadsList(client, params, searchUuids, 'on_time'),
  ]);

  return { total, breached, onTime };
}
