/**
 * Builds GET /api/old-leads query strings from old lead list toolbar state.
 */
import { buildOldLeadsQueryString } from '@/lib/ui/build-old-leads-query-string';
import type { LeadListFilterState } from '@/types/filter';

export type OldLeadListFilterState = LeadListFilterState;

export { DEFAULT_LEAD_LIST_STATE as DEFAULT_OLD_LEAD_LIST_STATE } from '@/types/filter';

/**
 * Builds query string from applied old lead list filter state.
 */
export function buildQueryFromOldLeadListState(
  state: OldLeadListFilterState,
  options?: { cursor?: string },
): string {
  return buildOldLeadsQueryString({
    sort: state.sort,
    search: state.search,
    fieldFilters: state.fieldFilters,
    createdFrom: state.createdFrom,
    createdTo: state.createdTo,
    lastContactFrom: state.lastContactFrom,
    lastContactTo: state.lastContactTo,
    moveInFrom: state.moveInFrom,
    moveInTo: state.moveInTo,
    cursor: options?.cursor,
  });
}
