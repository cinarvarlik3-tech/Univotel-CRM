/**
 * Query string builder for old leads list API.
 */

export interface OldLeadsListQuery {
  search?: string;
  leadSource?: string;
  messageFrom?: string;
  cursor?: string;
}

/**
 * Builds query string for GET /api/old-leads.
 * @param params - Filter and pagination options.
 * @returns Query string including leading ? when non-empty.
 */
export function buildOldLeadsQueryString(params: OldLeadsListQuery): string {
  const qs = new URLSearchParams();

  if (params.search?.trim()) {
    qs.set('search', params.search.trim());
  }
  if (params.leadSource) {
    qs.set('lead_source', params.leadSource);
  }
  if (params.messageFrom) {
    qs.set('message_from', params.messageFrom);
  }
  if (params.cursor) {
    qs.set('cursor', params.cursor);
  }

  const str = qs.toString();
  return str ? `?${str}` : '';
}
