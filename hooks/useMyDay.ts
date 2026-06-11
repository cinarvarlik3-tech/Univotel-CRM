/**
 * SWR hook for My Day cockpit data.
 * Revalidates every 60 seconds to keep counters live.
 */
import useSWR from 'swr';
import type { MyDayPayload } from '@/lib/my-day/aggregations';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

export function useMyDay() {
  return useSWR<MyDayPayload>('/api/my-day', fetcher, {
    refreshInterval: 60_000,
  });
}
