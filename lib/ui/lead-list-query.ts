/**
 * Builds GET /api/leads query strings from lead list toolbar state.
 */
import { buildLeadsQueryString } from '@/lib/ui/build-leads-query-string';
import type { LeadListFilterState } from '@/types/filter';

/**
 * Builds query string from applied list filter state.
 * @param state - Applied filter state.
 * @param options - Pagination cursor, mine-only scope, and pipeline overrides.
 * @returns Query string for GET /api/leads.
 */
export function buildQueryFromLeadListState(
  state: LeadListFilterState,
  options?: {
    cursor?: string;
    mine?: boolean;
    unassigned?: boolean;
    showAll?: boolean;
    skipFields?: ReadonlySet<string>;
    forceFieldFilters?: LeadListFilterState['fieldFilters'];
  },
): string {
  return buildLeadsQueryString({
    sort: state.sort,
    sortDir: state.sortDir,
    search: state.search,
    fieldFilters: state.fieldFilters,
    createdFrom: state.createdFrom,
    createdTo: state.createdTo,
    slaFrom: state.slaFrom,
    slaTo: state.slaTo,
    lastContactFrom: state.lastContactFrom,
    lastContactTo: state.lastContactTo,
    moveInFrom: state.moveInFrom,
    moveInTo: state.moveInTo,
    cursor: options?.cursor,
    mine: options?.mine,
    unassigned: options?.unassigned,
    showAll: options?.showAll,
    skipFields: options?.skipFields,
    forceFieldFilters: options?.forceFieldFilters,
  });
}
