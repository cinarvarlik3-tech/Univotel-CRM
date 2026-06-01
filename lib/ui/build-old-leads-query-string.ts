/**
 * Builds URL query strings for GET /api/old-leads from UI filter state.
 */
import {
  DEFAULT_PAGE_LIMIT,
  OLD_LEAD_LIST_FILTER_FIELDS,
  OLD_SORTABLE_COLUMNS,
} from '@/lib/constants';
import { OLD_LEAD_FILTER_FIELD_META } from '@/lib/query/filter-field-config';
import { appendListFilterParams, type DateRangeFilter } from '@/lib/ui/append-list-filter-params';
import {
  DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
  type ExtendedListFilterFields,
} from '@/lib/ui/list-filter-types';

const UI_FILTER_FIELDS = new Set<string>(OLD_LEAD_LIST_FILTER_FIELDS);

/** Input for building an old leads list API query string. */
export interface OldLeadsListQueryInput {
  sort?: string;
  cursor?: string;
  limit?: number;
  search?: string;
  fuzzy?: boolean;
  filters?: Record<string, string>;
  extended?: ExtendedListFilterFields;
  dateFilters?: DateRangeFilter[];
  scoreMin?: string;
}

/**
 * Builds a query string for GET /api/old-leads.
 * @param input - Sort, cursor, limit, search, fuzzy, filters, and date ranges.
 * @returns Query string including leading `?`, or empty string if no params.
 */
export function buildOldLeadsQueryString(input: OldLeadsListQueryInput): string {
  const params = new URLSearchParams();

  const limit = input.limit ?? DEFAULT_PAGE_LIMIT;
  params.set('limit', String(limit));

  const sort = input.sort && OLD_SORTABLE_COLUMNS.has(input.sort) ? input.sort : 'created_at';
  params.set('sort', sort);

  if (input.cursor) {
    params.set('cursor', input.cursor);
  }

  const search = input.search?.trim();
  if (search) {
    params.set('search', search);
  }

  if (input.fuzzy && search) {
    params.set('fuzzy', '1');
  }

  appendListFilterParams(params, {
    allowedFields: UI_FILTER_FIELDS,
    fieldMeta: OLD_LEAD_FILTER_FIELD_META,
    filters: input.filters,
    extended: input.extended ?? DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
    dateFilters: input.dateFilters,
    scoreMin: input.scoreMin,
    oldLeadRecHotel: true,
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
