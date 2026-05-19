/**
 * SWR hook for fetching properties inventory from API.
 */
import useSWR from 'swr';

import type { PropertyRow } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches read-only properties list.
 * @returns SWR response with properties array.
 */
export function useProperties() {
  return useSWR<PropertyRow[]>('/api/properties', fetcher);
}
