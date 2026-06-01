/**
 * SWR hook for fetching tasks list from API.
 */
import useSWR from 'swr';

import type { TaskRow } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches tasks via internal API.
 * @returns SWR response with tasks array.
 */
export function useTasks() {
  return useSWR<TaskRow[]>('/api/tasks', fetcher);
}
