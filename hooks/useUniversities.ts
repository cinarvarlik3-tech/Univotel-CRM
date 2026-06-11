/**
 * Fetches all active universities for the university combobox.
 * Sorted alphabetically by uni_name from the API.
 * Uses a long dedupe interval since university data is quasi-static.
 */
import useSWR from 'swr';
import type { UniversityRow } from '@/types/domain';

async function fetchUniversities(): Promise<UniversityRow[]> {
  const res = await fetch('/api/universities');
  if (!res.ok) throw new Error('Failed to fetch universities');
  const json = await res.json();
  return json.data;
}

/**
 * Returns active universities list for the university combobox.
 * Deduped for 10 minutes — reference data changes rarely.
 */
export function useUniversities() {
  return useSWR<UniversityRow[]>('/api/universities', fetchUniversities, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10 * 60 * 1000,
  });
}
