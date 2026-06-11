/**
 * SWR hook for the manager panel (team metrics + trends) on /dashboard.
 */
import useSWR from 'swr';
import type { ManagerPanelPayload, ManagerPanelRange } from '@/lib/analytics/manager-panel';

/** Fetcher for SWR GET requests — unwraps the { data } envelope. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches manager panel aggregates from GET /api/analytics/manager-panel.
 * @param enabled - When false, SWR key is null (skip fetch — non-managers).
 * @param range - Date range preset.
 * @param salespersonId - Optional salesperson scope for KPIs + trends.
 * @returns SWR response with manager panel payload.
 */
export function useManagerPanel(
  enabled: boolean,
  range: ManagerPanelRange,
  salespersonId?: string,
) {
  const params = new URLSearchParams({ range });
  if (salespersonId) params.set('salesperson', salespersonId);

  return useSWR<ManagerPanelPayload>(
    enabled ? `/api/analytics/manager-panel?${params.toString()}` : null,
    fetcher,
    // Keep stale data visible while switching range/salesperson scope.
    { keepPreviousData: true },
  );
}
