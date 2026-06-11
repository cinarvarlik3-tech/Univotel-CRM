/**
 * Builds URL query strings for GET /api/old-leads from UI filter state.
 */
import {
  DEFAULT_PAGE_LIMIT,
  OLD_LEAD_LIST_FILTER_FIELDS,
  OLD_SORTABLE_COLUMNS,
} from '@/lib/constants';
import { OLD_LEAD_FILTER_FIELD_REGISTRY } from '@/lib/leads/filter-field-registry';
import { appendFieldFilters } from '@/lib/ui/serialize-field-filters';
import type { FieldFilterState, SistemDateRanges } from '@/types/filter';

const UI_FILTER_FIELDS = new Set<string>(OLD_LEAD_LIST_FILTER_FIELDS);

/** Input for building an old leads list API query string. */
export interface OldLeadsListQueryInput {
  sort?: string;
  cursor?: string;
  limit?: number;
  search?: string;
  fieldFilters?: Record<string, FieldFilterState>;
  createdFrom?: string;
  createdTo?: string;
  lastContactFrom?: string;
  lastContactTo?: string;
  moveInFrom?: string;
  moveInTo?: string;
}

function sistemRangesFromInput(input: OldLeadsListQueryInput): SistemDateRanges | undefined {
  const { createdFrom, createdTo, lastContactFrom, lastContactTo, moveInFrom, moveInTo } = input;
  if (
    !createdFrom &&
    !createdTo &&
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
    slaFrom: '',
    slaTo: '',
    lastContactFrom: lastContactFrom ?? '',
    lastContactTo: lastContactTo ?? '',
    moveInFrom: moveInFrom ?? '',
    moveInTo: moveInTo ?? '',
  };
}

/**
 * Builds a query string for GET /api/old-leads.
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

  appendFieldFilters(params, {
    fieldFilters: input.fieldFilters ?? {},
    sistemRanges: sistemRangesFromInput(input),
    allowedFields: UI_FILTER_FIELDS,
    registry: OLD_LEAD_FILTER_FIELD_REGISTRY,
    oldLeadRecHotel: true,
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
