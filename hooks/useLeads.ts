/**
 * SWR hook wrapper for fetching leads list from API.
 */
import useSWR from 'swr';

import type { LeadWithDetails } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/** Leads list API response payload. */
export interface LeadsListResponse {
  leads: LeadWithDetails[];
  nextCursor: string | null;
  totalCount: number;
  kpiCounts: {
    breached: number;
    onTime: number;
  };
}

/**
 * Fetches paginated leads list via internal API.
 * @param params - Optional query string for filters/cursor; pass null to skip fetch.
 * @returns SWR response with leads data.
 */
export function useLeads(params: string | null = '') {
  return useSWR<LeadsListResponse>(params === null ? null : `/api/leads${params}`, fetcher);
}
