/**
 * Lead relevance helpers — mirrors the "Show All Leads" toggle filter in leads-list-query.
 * Irrelevant (inactive) leads are hidden from default list views but included in search.
 */
import { IRRELEVANT_FUNNEL_STATUSES } from '@/lib/constants';

const IRRELEVANT_STATUS_SET = new Set<string>(IRRELEVANT_FUNNEL_STATUSES);

export interface LeadRelevanceFields {
  funnel_status: string;
  has_moved_in?: boolean | null;
  is_24h_restricted?: boolean | null;
}

/** True when a lead is hidden unless "Show All Leads" is enabled. */
export function isIrrelevantLead(lead: LeadRelevanceFields): boolean {
  return (
    IRRELEVANT_STATUS_SET.has(lead.funnel_status) ||
    Boolean(lead.has_moved_in) ||
    Boolean(lead.is_24h_restricted)
  );
}

/** True when a list/search query has an active text search. */
export function isLeadsSearchActive(searchTerm: string, searchUuids?: string[] | null): boolean {
  return searchTerm.trim().length > 0 || (searchUuids !== undefined && searchUuids !== null);
}
