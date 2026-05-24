/**
 * SWR hook wrapper for fetching archived leads list from API.
 */
import useSWR from 'swr';

import type { ArchivedLeadRow } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches paginated archived leads list via internal API.
 * @param params - Optional query string for filters/cursor.
 * @returns SWR response with archived leads data.
 */
export function useArchivedLeads(params = '', enabled = true) {
  return useSWR<{ archivedLeads: ArchivedLeadRow[]; nextCursor: string | null }>(
    enabled ? `/api/leads/archived${params}` : null,
    fetcher,
  );
}
