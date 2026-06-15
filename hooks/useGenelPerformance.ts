/**
 * SWR hook for Genel Performans metrics.
 * Supports four range modes: this_week, this_month, all_time (default),
 * and a custom { from, to } date range.
 */
import useSWR from 'swr';
import type { PerformancePayload } from '@/lib/my-day/performance';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

export type GenelRange = 'this_week' | 'this_month' | 'all_time' | { from: string; to: string };

function buildUrl(range: GenelRange): string {
  if (typeof range === 'object') {
    return `/api/my-day/genel-performans?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  }
  return `/api/my-day/genel-performans?range=${range}`;
}

export function useGenelPerformance(range: GenelRange = 'all_time') {
  const url = typeof range === 'object' && (!range.from || !range.to) ? null : buildUrl(range);
  return useSWR<PerformancePayload>(url, fetcher);
}
