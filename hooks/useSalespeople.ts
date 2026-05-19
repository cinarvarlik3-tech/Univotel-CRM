/**
 * SWR hook for fetching salespeople list from API.
 */
import useSWR from 'swr';

import type { SalespersonOption } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches salespeople for dropdowns (full list for managers, own row for salespeople).
 * @returns SWR response with salespeople array.
 */
export function useSalespeople() {
  return useSWR<SalespersonOption[]>('/api/salespeople', fetcher);
}
