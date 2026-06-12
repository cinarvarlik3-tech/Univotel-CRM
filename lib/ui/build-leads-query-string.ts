/**
 * Builds URL query strings for GET /api/leads from UI filter state.
 */
import { DEFAULT_PAGE_LIMIT, LEAD_LIST_FILTER_FIELDS, SORTABLE_COLUMNS } from '@/lib/constants';
import { LEAD_FILTER_FIELD_META } from '@/lib/query/filter-field-config';
import { LEAD_FILTER_FIELD_REGISTRY } from '@/lib/leads/filter-field-registry';
import { appendFieldFilters } from '@/lib/ui/serialize-field-filters';
import type { FieldFilterState, SistemDateRanges } from '@/types/filter';

const UI_FILTER_FIELDS = new Set<string>(LEAD_LIST_FILTER_FIELDS);

/** Input for building a leads list API query string. */
export interface LeadListQueryInput {
  sort?: string;
  /** Sort direction. Defaults to 'desc'. Use 'asc' for "En son temas" (furthest-past-first). */
  sortDir?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
  search?: string;
  fieldFilters?: Record<string, FieldFilterState>;
  /** Sistem section date-range shortcuts. */
  createdFrom?: string;
  createdTo?: string;
  slaFrom?: string;
  slaTo?: string;
  lastContactFrom?: string;
  lastContactTo?: string;
  moveInFrom?: string;
  moveInTo?: string;
  /** When true, API returns only leads assigned to the current user. */
  mine?: boolean;
  /** When true, returns only unassigned leads (assigned_to IS NULL). Used for Lead Hub. */
  unassigned?: boolean;
  /** When true (manager+ only), bypasses relevance filter to include lost / moved-in leads. */
  showAll?: boolean;
  /** Field ids excluded from serialization (pipeline strips funnel_status). */
  skipFields?: ReadonlySet<string>;
  /** Merged after fieldFilters (pipeline forces deal_awaiting=false). */
  forceFieldFilters?: Record<string, FieldFilterState>;
}

function sistemRangesFromInput(input: LeadListQueryInput): SistemDateRanges | undefined {
  const {
    createdFrom,
    createdTo,
    slaFrom,
    slaTo,
    lastContactFrom,
    lastContactTo,
    moveInFrom,
    moveInTo,
  } = input;
  if (
    !createdFrom &&
    !createdTo &&
    !slaFrom &&
    !slaTo &&
    !lastContactFrom &&
    !lastContactTo &&
    !moveInFrom &&
    !moveInTo
  ) {
    return undefined;
  }
  return {
    createdFrom: createdFrom ?? '',
    createdTo: createdTo ?? '',
    slaFrom: slaFrom ?? '',
    slaTo: slaTo ?? '',
    lastContactFrom: lastContactFrom ?? '',
    lastContactTo: lastContactTo ?? '',
    moveInFrom: moveInFrom ?? '',
    moveInTo: moveInTo ?? '',
  };
}

/**
 * Builds a query string for GET /api/leads.
 * @param input - Sort, cursor, limit, search, field filters, and date ranges.
 * @returns Query string including leading `?`, or empty string if no params.
 */
export function buildLeadsQueryString(input: LeadListQueryInput): string {
  const params = new URLSearchParams();

  const limit = input.limit ?? DEFAULT_PAGE_LIMIT;
  params.set('limit', String(limit));

  const sort = input.sort && SORTABLE_COLUMNS.has(input.sort) ? input.sort : 'created_at';
  params.set('sort', sort);

  if (input.sortDir && input.sortDir !== 'desc') {
    params.set('sort_dir', input.sortDir);
  }

  if (input.cursor) {
    params.set('cursor', input.cursor);
  }

  const search = input.search?.trim();
  if (search) {
    params.set('search', search);
  }

  appendFieldFilters(params, {
    fieldFilters: input.fieldFilters ?? {},
    sistemRanges: sistemRangesFromInput(input),
    allowedFields: UI_FILTER_FIELDS,
    fieldMeta: LEAD_FILTER_FIELD_META,
    registry: LEAD_FILTER_FIELD_REGISTRY,
    skipFields: input.skipFields,
    forceFieldFilters: input.forceFieldFilters,
  });

  if (input.mine) {
    params.set('mine', '1');
  }

  if (input.unassigned) {
    params.set('unassigned', '1');
  }

  if (input.showAll) {
    params.set('show_all', '1');
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
