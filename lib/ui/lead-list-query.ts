/**
 * Builds GET /api/leads query strings from lead list toolbar state.
 */
import type { LeadListFilterState } from '@/components/leads/LeadListToolbar';
import { buildLeadsQueryString } from '@/lib/ui/build-leads-query-string';

/**
 * Builds query string from applied list filter state.
 * @param state - Applied filter state.
 * @param options - Pagination cursor and mine-only scope.
 * @returns Query string for GET /api/leads.
 */
export function buildQueryFromLeadListState(
  state: LeadListFilterState,
  options?: { cursor?: string; mine?: boolean },
): string {
  const dateFilters = [];

  if (state.createdFrom || state.createdTo) {
    dateFilters.push({
      field: 'created_at',
      from: state.createdFrom ? `${state.createdFrom}T00:00:00Z` : undefined,
      to: state.createdTo ? `${state.createdTo}T23:59:59Z` : undefined,
    });
  }

  if (state.slaFrom || state.slaTo) {
    dateFilters.push({
      field: 'sla_deadline',
      from: state.slaFrom ? `${state.slaFrom}T00:00:00Z` : undefined,
      to: state.slaTo ? `${state.slaTo}T23:59:59Z` : undefined,
    });
  }

  return buildLeadsQueryString({
    sort: state.sort,
    search: state.search,
    fuzzy: state.fuzzy,
    filters: state.filters,
    dateFilters,
    scoreMin: state.scoreMin || undefined,
    cursor: options?.cursor,
    mine: options?.mine,
  });
}
