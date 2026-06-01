/**
 * Builds URL query strings for GET /api/leads from UI filter state.
 */
import { DEFAULT_PAGE_LIMIT, LEAD_LIST_FILTER_FIELDS, SORTABLE_COLUMNS } from '@/lib/constants';
import { LEAD_FILTER_FIELD_META } from '@/lib/query/filter-field-config';
import { appendListFilterParams, type DateRangeFilter } from '@/lib/ui/append-list-filter-params';
import {
  DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
  type ExtendedListFilterFields,
} from '@/lib/ui/list-filter-types';

const UI_FILTER_FIELDS = new Set<string>(LEAD_LIST_FILTER_FIELDS);

/** Input for building a leads list API query string. */
export interface LeadListQueryInput {
  sort?: string;
  cursor?: string;
  limit?: number;
  search?: string;
  fuzzy?: boolean;
  filters?: Record<string, string>;
  extended?: ExtendedListFilterFields;
  dateFilters?: DateRangeFilter[];
  scoreMin?: string;
  /** When true, API returns only leads assigned to the current user. */
  mine?: boolean;
}

/**
 * Builds a query string for GET /api/leads.
 * @param input - Sort, cursor, limit, search, fuzzy, filters, and date ranges.
 * @returns Query string including leading `?`, or empty string if no params.
 */
export function buildLeadsQueryString(input: LeadListQueryInput): string {
  const params = new URLSearchParams();

  const limit = input.limit ?? DEFAULT_PAGE_LIMIT;
  params.set('limit', String(limit));

  const sort = input.sort && SORTABLE_COLUMNS.has(input.sort) ? input.sort : 'created_at';
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
    fieldMeta: LEAD_FILTER_FIELD_META,
    filters: input.filters,
    extended: input.extended ?? DEFAULT_EXTENDED_LIST_FILTER_FIELDS,
    dateFilters: input.dateFilters,
    scoreMin: input.scoreMin,
    oldLeadRecHotel: false,
  });

  if (input.mine) {
    params.set('mine', '1');
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
