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

export type GenelRange =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'all_time'
  | { from: string; to: string };

function buildUrl(range: GenelRange): string {
  if (typeof range === 'object') {
    return `/api/my-day/genel-performans?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  }
  return `/api/my-day/genel-performans?range=${range}`;
}

export function useGenelPerformance(range: GenelRange = 'all_time') {
  const url = typeof range === 'object' && (!range.from || !range.to) ? null : buildUrl(range);
  // keepPreviousData: when the range changes, keep showing the current data (so the
  // section layout stays mounted) and only swap the numbers once the new data lands —
  // instead of unmounting everything into the full-page skeleton on first fetch of a key.
  return useSWR<PerformancePayload>(url, fetcher, { keepPreviousData: true });
}
