/**
 * SWR hook for manager analytics dashboard data.
 */
import useSWR from 'swr';

import type { AnalyticsPayload } from '@/types/domain';

/** Fetcher for SWR GET requests. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches analytics aggregates from GET /api/analytics.
 * @param enabled - When false, SWR key is null (skip fetch).
 * @returns SWR response with analytics payload.
 */
export function useAnalytics(enabled: boolean) {
  return useSWR<AnalyticsPayload>(enabled ? '/api/analytics' : null, fetcher);
}
