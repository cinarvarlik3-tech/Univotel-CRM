/**
 * Builds URL query strings for GET /api/leads from UI filter state.
 */
import { DEFAULT_PAGE_LIMIT, LEAD_LIST_FILTER_FIELDS, SORTABLE_COLUMNS } from '@/lib/constants';

const UI_FILTER_FIELDS = new Set<string>(LEAD_LIST_FILTER_FIELDS);

/** Date range filter for a single field. */
export interface DateRangeFilter {
  field: string;
  from?: string;
  to?: string;
}

/** Input for building a leads list API query string. */
export interface LeadListQueryInput {
  sort?: string;
  cursor?: string;
  limit?: number;
  search?: string;
  fuzzy?: boolean;
  filters?: Record<string, string>;
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

  if (input.filters) {
    for (const [field, value] of Object.entries(input.filters)) {
      if (!value || !UI_FILTER_FIELDS.has(field)) continue;
      params.set(`filter[${field}][eq]`, value);
    }
  }

  if (input.dateFilters) {
    for (const { field, from, to } of input.dateFilters) {
      if (!UI_FILTER_FIELDS.has(field)) continue;
      if (from) params.set(`filter[${field}][gte]`, from);
      if (to) params.set(`filter[${field}][lte]`, to);
    }
  }

  if (input.scoreMin) {
    params.set('filter[lead_score][gte]', input.scoreMin);
  }

  if (input.mine) {
    params.set('mine', '1');
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
