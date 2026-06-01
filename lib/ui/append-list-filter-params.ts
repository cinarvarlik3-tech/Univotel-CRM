/**
 * Appends list filter query params from toolbar state to URLSearchParams.
 */
import type { FilterFieldMeta } from '@/lib/query/filter-field-config';
import { toPostgresArrayLiteral } from '@/lib/query/filter-field-config';
import type { ExtendedListFilterFields, PresenceFilter } from '@/lib/ui/list-filter-types';

/** Date range filter for a single field. */
export interface DateRangeFilter {
  field: string;
  from?: string;
  to?: string;
}

/** Input for appending list filters to a query string. */
export interface AppendListFilterParamsInput {
  allowedFields: ReadonlySet<string>;
  fieldMeta: Record<string, FilterFieldMeta>;
  filters?: Record<string, string>;
  extended: ExtendedListFilterFields;
  dateFilters?: DateRangeFilter[];
  scoreMin?: string;
  /** When true, old-lead rec_hotel uses composite empty-string handling. */
  oldLeadRecHotel?: boolean;
}

/**
 * Sets a presence filter param for a nullable column.
 * @param params - URL search params being built.
 * @param field - Column name.
 * @param value - Tri-state presence value.
 */
function appendPresenceFilter(params: URLSearchParams, field: string, value: PresenceFilter): void {
  if (value === 'yes') {
    params.set(`filter[${field}][is]`, 'not.null');
  } else if (value === 'no') {
    params.set(`filter[${field}][is]`, 'null');
  }
}

/**
 * Sets eq filter when value is non-empty and field is whitelisted.
 * @param params - URL search params being built.
 * @param allowedFields - Whitelist of filterable columns.
 * @param field - Column name.
 * @param value - Filter value.
 */
function appendEqFilter(
  params: URLSearchParams,
  allowedFields: ReadonlySet<string>,
  field: string,
  value: string,
): void {
  if (!value || !allowedFields.has(field)) return;
  params.set(`filter[${field}][eq]`, value);
}

/**
 * Sets ilike filter with wildcards for partial text match.
 * @param params - URL search params being built.
 * @param allowedFields - Whitelist of filterable columns.
 * @param field - Column name.
 * @param value - Raw search text.
 */
function appendIlikeFilter(
  params: URLSearchParams,
  allowedFields: ReadonlySet<string>,
  field: string,
  value: string,
): void {
  const trimmed = value.trim();
  if (!trimmed || !allowedFields.has(field)) return;
  params.set(`filter[${field}][ilike]`, `%${trimmed}%`);
}

/**
 * Appends all list filter params derived from toolbar state.
 * @param params - URL search params being built.
 * @param input - Filter state and field metadata.
 */
export function appendListFilterParams(
  params: URLSearchParams,
  input: AppendListFilterParamsInput,
): void {
  const { allowedFields, fieldMeta, filters, extended, dateFilters, scoreMin, oldLeadRecHotel } =
    input;

  if (filters) {
    for (const [field, value] of Object.entries(filters)) {
      if (!value || !allowedFields.has(field)) continue;

      if (field === 'assigned_to' && value === '__unassigned__') {
        params.set('filter[assigned_to][is]', 'null');
        continue;
      }

      const meta = fieldMeta[field];
      if (meta?.textMatch === 'ilike') {
        appendIlikeFilter(params, allowedFields, field, value);
      } else {
        params.set(`filter[${field}][eq]`, value);
      }
    }
  }

  if (extended.unassignedOnly && allowedFields.has('assigned_to')) {
    params.set('filter[assigned_to][is]', 'null');
  }

  if (dateFilters) {
    for (const { field, from, to } of dateFilters) {
      if (!allowedFields.has(field)) continue;
      if (from) params.set(`filter[${field}][gte]`, from);
      if (to) params.set(`filter[${field}][lte]`, to);
    }
  }

  if (scoreMin && allowedFields.has('lead_score')) {
    params.set('filter[lead_score][gte]', scoreMin);
  }

  if (extended.budgetMin && allowedFields.has('budget_min')) {
    params.set('filter[budget_min][gte]', extended.budgetMin);
  }

  if (extended.budgetMax && allowedFields.has('budget_max')) {
    params.set('filter[budget_max][lte]', extended.budgetMax);
  }

  appendIlikeFilter(params, allowedFields, 'preferred_district', extended.preferredDistrict);
  appendIlikeFilter(params, allowedFields, 'district_preference', extended.districtPreference);
  appendIlikeFilter(params, allowedFields, 'campus', extended.campus);
  appendIlikeFilter(params, allowedFields, 'nationality', extended.nationality);

  appendEqFilter(params, allowedFields, 'room_category', extended.roomCategory);

  if (extended.dormAwaiting.length > 0 && allowedFields.has('dorm_awaiting')) {
    params.set('filter[dorm_awaiting][ov]', toPostgresArrayLiteral(extended.dormAwaiting));
  }

  if (extended.interestedHotel.trim() && allowedFields.has('interested_hotel')) {
    params.set(
      'filter[interested_hotel][cs]',
      toPostgresArrayLiteral([extended.interestedHotel.trim()]),
    );
  }

  if (extended.roomType.trim() && allowedFields.has('room_type')) {
    params.set('filter[room_type][cs]', toPostgresArrayLiteral([extended.roomType.trim()]));
  }

  if (extended.missingUniversity && allowedFields.has('university')) {
    params.set('filter[university][is]', 'null');
  }

  if (extended.missingGender && allowedFields.has('student_gender')) {
    params.set('filter[student_gender][is]', 'null');
  }

  if (
    extended.missingBudget &&
    allowedFields.has('budget_min') &&
    allowedFields.has('budget_max')
  ) {
    params.set('filter[budget_min][is]', 'null');
    params.set('filter[budget_max][is]', 'null');
  }

  appendPresenceFilter(params, 'parent_phone', extended.hasParentPhone);
  appendPresenceFilter(params, 'parent_name', extended.hasParentName);

  if (extended.hasRecHotel !== 'any' && allowedFields.has('rec_hotel')) {
    if (oldLeadRecHotel) {
      const composite: string[] = [];
      if (extended.hasRecHotel === 'yes') composite.push('old_rec_hotel_present');
      if (extended.hasRecHotel === 'no') composite.push('old_rec_hotel_absent');
      if (composite.length > 0) {
        params.set('composite', composite.join(','));
      }
    } else if (extended.hasRecHotel === 'yes') {
      params.set('filter[rec_hotel][is]', 'not.null');
    } else {
      params.set('filter[rec_hotel][is]', 'null');
    }
  }
}
