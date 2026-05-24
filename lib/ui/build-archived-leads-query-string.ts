/**
 * Builds URL query strings for GET /api/leads/archived from UI filter state.
 */
import { DEFAULT_PAGE_LIMIT } from '@/lib/constants';

/** Input for building an archived leads list API query string. */
export interface ArchivedLeadListQueryInput {
  cursor?: string;
  limit?: number;
  search?: string;
  fuzzy?: boolean;
  archiveReason?: string;
  leadSource?: string;
  assignedTo?: string;
  archivedFrom?: string;
  archivedTo?: string;
}

/**
 * Builds a query string for GET /api/leads/archived.
 * @param input - Filter and pagination params.
 * @returns Query string including leading `?`, or empty string if no params.
 */
export function buildArchivedLeadsQueryString(input: ArchivedLeadListQueryInput): string {
  const params = new URLSearchParams();
  const limit = input.limit ?? DEFAULT_PAGE_LIMIT;

  params.set('limit', String(limit));

  if (input.cursor) params.set('cursor', input.cursor);
  if (input.archiveReason) params.set('archive_reason', input.archiveReason);
  if (input.leadSource) params.set('lead_source', input.leadSource);
  if (input.assignedTo) params.set('assigned_to', input.assignedTo);
  if (input.archivedFrom) params.set('archived_from', input.archivedFrom);
  if (input.archivedTo) params.set('archived_to', input.archivedTo);

  const search = input.search?.trim();
  if (search) params.set('search', search);
  if (input.fuzzy && search) params.set('fuzzy', '1');

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
