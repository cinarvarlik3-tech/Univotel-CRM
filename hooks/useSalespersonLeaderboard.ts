/**
 * SWR hook for the salesperson leaderboard.
 */
import useSWR from 'swr';
import type {
  SalespersonLeaderboardPayload,
  LeaderboardSortKey,
} from '@/lib/analytics/salesperson-leaderboard';
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

export function useSalespersonLeaderboard(
  enabled: boolean,
  range: OverviewRangeSelection,
  sort: LeaderboardSortKey,
  includeKapora: boolean,
) {
  const params = new URLSearchParams({
    range: serializeOverviewRangeParam(range),
    sort,
    includeKapora: String(includeKapora),
  });

  return useSWR<SalespersonLeaderboardPayload>(
    enabled ? `/api/analytics/salesperson-leaderboard?${params.toString()}` : null,
    fetcher,
    { keepPreviousData: true },
  );
}
