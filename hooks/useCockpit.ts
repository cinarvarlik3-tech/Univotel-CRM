/**
 * SWR hook for the My Day cockpit payload (Tab 1 — Bugün).
 * Revalidates every 60 seconds to keep task containers live.
 */
import useSWR from 'swr';
import type { CockpitPayload } from '@/lib/my-day/cockpit';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

export function useCockpit() {
  return useSWR<CockpitPayload>('/api/my-day/cockpit', fetcher, {
    refreshInterval: 60_000,
  });
}
