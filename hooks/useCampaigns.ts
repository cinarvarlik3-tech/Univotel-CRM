/**
 * SWR hooks for WhatsApp campaigns.
 */
import useSWR from 'swr';
import type { CampaignRow } from '@/types/domain';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Lists campaigns for the current user.
 */
export function useCampaigns() {
  return useSWR<{ items: CampaignRow[]; nextCursor: string | null }>('/api/campaigns', fetcher);
}

/**
 * Loads a single campaign with summary counts.
 * @param id - Campaign UUID.
 */
export function useCampaign(id: string | undefined) {
  return useSWR<{
    campaign: CampaignRow;
    summary: Record<string, number>;
  }>(id ? `/api/campaigns/${id}` : null, fetcher, { refreshInterval: 10_000 });
}
