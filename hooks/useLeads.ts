/**
 * SWR hook wrapper for fetching leads list from API.
 */
import useSWR from 'swr';

import type { LeadRow } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches paginated leads list via internal API.
 * @param params - Optional query string for filters/cursor; pass null to skip fetch.
 * @returns SWR response with leads data.
 */
export function useLeads(params: string | null = '') {
  return useSWR<{ leads: LeadRow[]; nextCursor: string | null }>(
    params === null ? null : `/api/leads${params}`,
    fetcher,
  );
}
