/**
 * SWR hook wrapper for fetching old leads list from API.
 */
import useSWR from 'swr';

import type { OldLeadRow } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches paginated old leads list via internal API.
 * @param params - Optional query string for filters/cursor.
 * @param enabled - When false, skips the request.
 * @returns SWR response with old leads data.
 */
export function useOldLeads(params = '', enabled = true) {
  return useSWR<{ oldLeads: OldLeadRow[]; nextCursor: string | null }>(
    enabled ? `/api/old-leads${params}` : null,
    fetcher,
  );
}
