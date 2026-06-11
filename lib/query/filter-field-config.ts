/**
 * Filter field metadata for lead list query building and validation.
 */
import {
  LEAD_DETAILS_FILTER_FIELDS,
  LEADS_TABLE_FILTER_FIELDS,
  OLD_LEAD_DETAILS_FILTER_FIELDS,
  OLD_LEADS_TABLE_FILTER_FIELDS,
} from '@/lib/constants';

/** Which table a filterable column lives on. */
export type FilterFieldTable = 'leads' | 'details';

/** How a text input field is matched in PostgREST. */
export type FilterTextMatch = 'eq' | 'ilike';

/** Metadata for a single filterable column. */
export interface FilterFieldMeta {
  table: FilterFieldTable;
  textMatch?: FilterTextMatch;
  /** Array overlap (&&) — match any selected element. */
  arrayOverlap?: boolean;
  /** Array contains (@>) — single value must be in array. */
  arrayContains?: boolean;
}

/** Fields on lead_details / old_lead_details that use partial text match. */
const DETAILS_ILIKE_FIELDS = new Set([
  'university',
  'preferred_district',
  'district_preference',
  'campus',
  'nationality',
  'parent_name',
  'school_shortname',
]);

/** Fields on leads table that use partial text match. */
const LEADS_ILIKE_FIELDS = new Set(['notes', 'parent_phone']);

/** Array fields filtered via overlap (any-of multi-select). */
const DETAILS_OVERLAP_FIELDS = new Set(['dorm_awaiting']);

/** Array fields filtered via contains (single value). */
const DETAILS_CONTAINS_FIELDS = new Set(['interested_hotel', 'room_type']);

function buildMeta(
  fields: readonly string[],
  table: FilterFieldTable,
): Record<string, FilterFieldMeta> {
  const meta: Record<string, FilterFieldMeta> = {};
  for (const field of fields) {
    if (table === 'details') {
      if (DETAILS_ILIKE_FIELDS.has(field)) {
        meta[field] = { table, textMatch: 'ilike' };
      } else if (DETAILS_OVERLAP_FIELDS.has(field)) {
        meta[field] = { table, arrayOverlap: true };
      } else if (DETAILS_CONTAINS_FIELDS.has(field)) {
        meta[field] = { table, arrayContains: true };
      } else {
        meta[field] = { table, textMatch: 'eq' };
      }
    } else if (LEADS_ILIKE_FIELDS.has(field)) {
      meta[field] = { table, textMatch: 'ilike' };
    } else {
      meta[field] = { table, textMatch: 'eq' };
    }
  }
  return meta;
}

/** Active lead filter field metadata keyed by column name. */
export const LEAD_FILTER_FIELD_META: Record<string, FilterFieldMeta> = {
  ...buildMeta(LEADS_TABLE_FILTER_FIELDS, 'leads'),
  ...buildMeta(LEAD_DETAILS_FILTER_FIELDS, 'details'),
};

/** Old lead filter field metadata keyed by column name. */
export const OLD_LEAD_FILTER_FIELD_META: Record<string, FilterFieldMeta> = {
  ...buildMeta(OLD_LEADS_TABLE_FILTER_FIELDS, 'leads'),
  ...buildMeta(OLD_LEAD_DETAILS_FILTER_FIELDS, 'details'),
};

/**
 * Returns true when the field belongs to the details embed table.
 * @param field - Column name.
 * @param meta - Field metadata map for active or old leads.
 */
export function isDetailsFilterField(
  field: string,
  meta: Record<string, FilterFieldMeta>,
): boolean {
  return meta[field]?.table === 'details';
}

/**
 * Builds a Postgres array literal for overlap/contains filters.
 * @param values - Array element strings.
 * @returns Braced Postgres array literal e.g. `{a,b}`.
 */
export function toPostgresArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}
