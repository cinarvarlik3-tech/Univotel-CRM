/**
 * Serializes per-field filter state into PostgREST query params.
 */
import type { FilterFieldDef } from '@/lib/leads/filter-field-registry';
import { getFilterFieldDef } from '@/lib/leads/filter-field-registry';
import type { FilterFieldMeta } from '@/lib/query/filter-field-config';
import { toPostgresArrayLiteral } from '@/lib/query/filter-field-config';
import type { FieldFilterState, SistemDateRanges } from '@/types/filter';
import { isFieldFilterActive } from '@/types/filter';

const ARRAY_CONTAINS_FIELDS = new Set(['interested_hotel', 'room_type']);

function appendPresence(
  params: URLSearchParams,
  field: string,
  presence: 'filled' | 'empty',
): void {
  if (presence === 'filled') {
    params.set(`filter[${field}][is]`, 'not.null');
  } else {
    params.set(`filter[${field}][is]`, 'null');
  }
}

function appendTextMatch(
  params: URLSearchParams,
  field: string,
  value: string,
  fuzzy: boolean,
): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (fuzzy) {
    params.set(`filter[${field}][ilike]`, `%${trimmed}%`);
  } else {
    params.set(`filter[${field}][eq]`, trimmed);
  }
}

function appendComparison(
  params: URLSearchParams,
  field: string,
  operator: string,
  value: string,
): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  params.set(`filter[${field}][${operator}]`, trimmed);
}

function appendFieldFilter(
  params: URLSearchParams,
  def: FilterFieldDef,
  filter: FieldFilterState,
  allowedFields: ReadonlySet<string>,
  oldLeadRecHotel: boolean,
): void {
  const { id, kind } = def;
  if (!allowedFields.has(id)) return;

  if (filter.mode === 'filled') {
    appendPresence(params, id, 'filled');
    return;
  }
  if (filter.mode === 'empty') {
    appendPresence(params, id, 'empty');
    return;
  }

  if (filter.mode !== 'match') return;

  switch (kind) {
    case 'enum': {
      if (filter.value) params.set(`filter[${id}][eq]`, filter.value);
      break;
    }
    case 'boolean': {
      if (id === 'rec_hotel') {
        if (filter.value === 'yes') {
          if (oldLeadRecHotel) {
            params.set('composite', 'old_rec_hotel_present');
          } else {
            params.set(`filter[${id}][is]`, 'not.null');
          }
        } else if (filter.value === 'no') {
          if (oldLeadRecHotel) {
            params.set('composite', 'old_rec_hotel_absent');
          } else {
            params.set(`filter[${id}][is]`, 'null');
          }
        }
      } else if (filter.value === 'true' || filter.value === 'false') {
        params.set(`filter[${id}][eq]`, filter.value);
      }
      break;
    }
    case 'text': {
      if (ARRAY_CONTAINS_FIELDS.has(id) && filter.value) {
        params.set(`filter[${id}][cs]`, toPostgresArrayLiteral([filter.value.trim()]));
      } else if (filter.value) {
        appendTextMatch(params, id, filter.value, filter.fuzzy ?? false);
      }
      break;
    }
    case 'multiselect': {
      if (filter.values && filter.values.length > 0) {
        params.set(`filter[${id}][ov]`, toPostgresArrayLiteral(filter.values));
      }
      break;
    }
    case 'number': {
      const op = filter.operator ?? 'gte';
      if (filter.value) appendComparison(params, id, op, filter.value);
      break;
    }
    case 'date': {
      const op = filter.operator ?? 'gte';
      if (filter.value) appendComparison(params, id, op, filter.value);
      break;
    }
    case 'assignee': {
      if (filter.value === '__unassigned__') {
        params.set(`filter[${id}][is]`, 'null');
      } else if (filter.value) {
        params.set(`filter[${id}][eq]`, filter.value);
      }
      break;
    }
    case 'university': {
      if (filter.value) {
        appendTextMatch(params, id, filter.value, filter.fuzzy ?? true);
      }
      break;
    }
    default:
      break;
  }
}

/** Appends sistem date-range shortcuts (from/to pairs). */
export function appendSistemDateRanges(
  params: URLSearchParams,
  ranges: SistemDateRanges,
  allowedFields: ReadonlySet<string>,
): void {
  const pairs: {
    field: string;
    from?: string;
    to?: string;
    fromKey: keyof SistemDateRanges;
    toKey: keyof SistemDateRanges;
    datetime?: boolean;
  }[] = [
    { field: 'created_at', fromKey: 'createdFrom', toKey: 'createdTo', datetime: true },
    { field: 'sla_deadline', fromKey: 'slaFrom', toKey: 'slaTo', datetime: true },
    {
      field: 'last_contact_at',
      fromKey: 'lastContactFrom',
      toKey: 'lastContactTo',
      datetime: true,
    },
    { field: 'move_in', fromKey: 'moveInFrom', toKey: 'moveInTo', datetime: false },
  ];

  for (const { field, fromKey, toKey, datetime } of pairs) {
    if (!allowedFields.has(field)) continue;
    const from = ranges[fromKey];
    const to = ranges[toKey];
    if (from) {
      params.set(`filter[${field}][gte]`, datetime ? `${from}T00:00:00Z` : from);
    }
    if (to) {
      params.set(`filter[${field}][lte]`, datetime ? `${to}T23:59:59Z` : to);
    }
  }
}

export interface SerializeFieldFiltersInput {
  fieldFilters: Record<string, FieldFilterState>;
  sistemRanges?: SistemDateRanges;
  allowedFields: ReadonlySet<string>;
  fieldMeta?: Record<string, FilterFieldMeta>;
  registry?: FilterFieldDef[];
  oldLeadRecHotel?: boolean;
  /** Field ids to skip (e.g. funnel_status in pipeline view). */
  skipFields?: ReadonlySet<string>;
  /** Override field values merged after serialization. */
  forceFieldFilters?: Record<string, FieldFilterState>;
}

/**
 * Appends all field filter params from toolbar state.
 */
export function appendFieldFilters(
  params: URLSearchParams,
  input: SerializeFieldFiltersInput,
): void {
  const {
    fieldFilters,
    sistemRanges,
    allowedFields,
    registry,
    oldLeadRecHotel = false,
    skipFields,
    forceFieldFilters,
  } = input;

  const merged = { ...fieldFilters, ...forceFieldFilters };

  for (const [fieldId, filter] of Object.entries(merged)) {
    if (skipFields?.has(fieldId)) continue;
    if (!isFieldFilterActive(filter)) continue;

    const def = registry?.find((f) => f.id === fieldId) ?? getFilterFieldDef(fieldId);
    if (!def) continue;

    if (def.id === 'rec_hotel' && def.kind === 'boolean') {
      if (filter.mode === 'filled') {
        appendPresence(params, 'rec_hotel', 'filled');
      } else if (filter.mode === 'empty') {
        appendPresence(params, 'rec_hotel', 'empty');
      } else if (filter.mode === 'match') {
        appendFieldFilter(params, def, filter, allowedFields, oldLeadRecHotel);
      }
      continue;
    }

    appendFieldFilter(params, def, filter, allowedFields, oldLeadRecHotel);
  }

  if (sistemRanges) {
    appendSistemDateRanges(params, sistemRanges, allowedFields);
  }
}
