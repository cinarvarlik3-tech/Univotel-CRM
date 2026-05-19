/**
 * Splits filter conditions between leads table and lead_details embed fields.
 */
import type { FilterCondition } from '@/lib/query/filter-builder';
import { LEAD_DETAILS_FILTER_FIELDS, LEADS_TABLE_FILTER_FIELDS } from '@/lib/constants';

const DETAILS_FIELDS = new Set<string>(LEAD_DETAILS_FILTER_FIELDS);
const LEADS_FIELDS = new Set<string>(LEADS_TABLE_FILTER_FIELDS);

/** Result of splitting filters by target table. */
export interface SplitFiltersResult {
  leads: FilterCondition[];
  leadDetails: FilterCondition[];
}

/**
 * Splits parsed filters into leads-root vs lead_details embed filters.
 * @param filters - Parsed filter conditions from query string.
 * @returns Filters partitioned by table.
 */
export function splitFilters(filters: FilterCondition[]): SplitFiltersResult {
  const leads: FilterCondition[] = [];
  const leadDetails: FilterCondition[] = [];

  for (const filter of filters) {
    if (DETAILS_FIELDS.has(filter.field)) {
      leadDetails.push(filter);
    } else if (LEADS_FIELDS.has(filter.field)) {
      leads.push(filter);
    }
  }

  return { leads, leadDetails };
}

/**
 * Returns true if any filter targets lead_details columns.
 * @param filters - Parsed filter conditions.
 * @returns Whether inner join on lead_details is required.
 */
export function requiresLeadDetailsJoin(filters: FilterCondition[]): boolean {
  return filters.some((f) => DETAILS_FIELDS.has(f.field));
}
