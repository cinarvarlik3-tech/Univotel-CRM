/**
 * SWR hook for manager notifications inbox.
 */
import useSWR from 'swr';
import type { NotificationRow } from '@/types/domain';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches unresolved manager notifications.
 */
export function useNotifications() {
  return useSWR<{ items: NotificationRow[]; nextCursor: string | null }>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 30_000 },
  );
}
