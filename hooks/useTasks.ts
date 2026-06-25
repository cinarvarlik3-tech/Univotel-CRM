/**
 * SWR hook for fetching tasks list from API.
 */
import useSWR from 'swr';

import type { TaskRow } from '@/types/domain';

export interface UseTasksOptions {
  /** Comma-separated or array of assignee IDs (manager multi-agent view). */
  assignees?: string[];
  status?: 'open' | 'overdue' | 'completed' | 'cancelled';
  dueFrom?: string;
  dueTo?: string;
}

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

function buildUrl(options: UseTasksOptions = {}): string {
  const params = new URLSearchParams();
  if (options.assignees && options.assignees.length > 0) {
    params.set('assignees', options.assignees.join(','));
  }
  if (options.status) params.set('status', options.status);
  if (options.dueFrom) params.set('due_from', options.dueFrom);
  if (options.dueTo) params.set('due_to', options.dueTo);
  const qs = params.toString();
  return qs ? `/api/tasks?${qs}` : '/api/tasks';
}

/**
 * Fetches tasks via internal API with optional filters.
 * @param options - Optional filter params for multi-agent or time-filtered views.
 * @returns SWR response with tasks array.
 */
export function useTasks(options: UseTasksOptions = {}) {
  const url = buildUrl(options);
  return useSWR<TaskRow[]>(url, fetcher);
}
