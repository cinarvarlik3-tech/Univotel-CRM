/**
 * Splits filter conditions between old_leads table and old_lead_details embed fields.
 */
import type { FilterCondition } from '@/lib/query/filter-builder';
import { OLD_LEAD_DETAILS_FILTER_FIELDS, OLD_LEADS_TABLE_FILTER_FIELDS } from '@/lib/constants';

const DETAILS_FIELDS = new Set<string>(OLD_LEAD_DETAILS_FILTER_FIELDS);
const TABLE_FIELDS = new Set<string>(OLD_LEADS_TABLE_FILTER_FIELDS);

/** Result of splitting old lead filters by target table. */
export interface SplitOldFiltersResult {
  oldLeads: FilterCondition[];
  oldLeadDetails: FilterCondition[];
}

/**
 * Splits parsed filters into old_leads-root vs old_lead_details embed filters.
 * @param filters - Parsed filter conditions from query string.
 * @returns Filters partitioned by table.
 */
export function splitOldFilters(filters: FilterCondition[]): SplitOldFiltersResult {
  const oldLeads: FilterCondition[] = [];
  const oldLeadDetails: FilterCondition[] = [];

  for (const filter of filters) {
    if (DETAILS_FIELDS.has(filter.field)) {
      oldLeadDetails.push(filter);
    } else if (TABLE_FIELDS.has(filter.field)) {
      oldLeads.push(filter);
    }
  }

  return { oldLeads, oldLeadDetails };
}

/**
 * Returns true if any filter targets old_lead_details columns.
 * @param filters - Parsed filter conditions.
 * @returns Whether inner join on old_lead_details is required.
 */
export function requiresOldLeadDetailsJoin(filters: FilterCondition[]): boolean {
  return filters.some((f) => DETAILS_FIELDS.has(f.field));
}
