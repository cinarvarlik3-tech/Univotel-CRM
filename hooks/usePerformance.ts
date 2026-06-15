/**
 * SWR hook for My Day performance metrics.
 */
import useSWR from 'swr';
import type { PerformancePayload } from '@/lib/my-day/performance';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

export type PerformanceRange = 'today' | 'this_week' | 'this_month';

export function usePerformance(range: PerformanceRange = 'today') {
  return useSWR<PerformancePayload>(`/api/my-day/performance?range=${range}`, fetcher);
}
