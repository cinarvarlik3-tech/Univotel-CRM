/**
 * Builds GET /api/old-leads query strings from old lead list toolbar state.
 */
import type { OldLeadListFilterState } from '@/components/leads/OldLeadListToolbar';
import { buildOldLeadsQueryString } from '@/lib/ui/build-old-leads-query-string';

/**
 * Builds query string from applied old lead list filter state.
 * @param state - Applied filter state.
 * @param options - Pagination cursor.
 * @returns Query string for GET /api/old-leads.
 */
export function buildQueryFromOldLeadListState(
  state: OldLeadListFilterState,
  options?: { cursor?: string },
): string {
  const dateFilters = [];

  if (state.createdFrom || state.createdTo) {
    dateFilters.push({
      field: 'created_at',
      from: state.createdFrom ? `${state.createdFrom}T00:00:00Z` : undefined,
      to: state.createdTo ? `${state.createdTo}T23:59:59Z` : undefined,
    });
  }

  if (state.lastContactFrom || state.lastContactTo) {
    dateFilters.push({
      field: 'last_contact_at',
      from: state.lastContactFrom ? `${state.lastContactFrom}T00:00:00Z` : undefined,
      to: state.lastContactTo ? `${state.lastContactTo}T23:59:59Z` : undefined,
    });
  }

  if (state.moveInFrom || state.moveInTo) {
    dateFilters.push({
      field: 'move_in',
      from: state.moveInFrom || undefined,
      to: state.moveInTo || undefined,
    });
  }

  return buildOldLeadsQueryString({
    sort: state.sort,
    search: state.search,
    fuzzy: state.fuzzy,
    filters: state.filters,
    extended: state,
    dateFilters,
    scoreMin: state.scoreMin || undefined,
    cursor: options?.cursor,
  });
}
