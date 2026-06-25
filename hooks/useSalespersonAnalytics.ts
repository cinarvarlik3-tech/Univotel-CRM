/**
 * SWR hook for per-salesperson analytics detail payload.
 */
import useSWR from 'swr';
import type { SalespersonAnalyticsPayload } from '@/lib/analytics/salesperson';
import {
  serializeOverviewRangeParam,
  type OverviewRangeSelection,
} from '@/lib/analytics/overview-range';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

export function useSalespersonAnalytics(
  repId: string | null,
  range: OverviewRangeSelection,
  includeKapora: boolean,
) {
  const params = new URLSearchParams({
    range: serializeOverviewRangeParam(range),
    includeKapora: String(includeKapora),
  });
  if (repId) params.set('rep', repId);

  return useSWR<SalespersonAnalyticsPayload>(
    repId ? `/api/analytics/salesperson?${params.toString()}` : null,
    fetcher,
    { keepPreviousData: true },
  );
}
