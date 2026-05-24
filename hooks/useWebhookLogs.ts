/**
 * SWR hook for webhook audit logs (manager).
 */
import useSWR from 'swr';

export interface WebhookLogListItem {
  id: string;
  idempotency_key: string;
  source: string;
  event_type: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  processed_at: string | null;
  created_at: string;
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/**
 * Fetches webhook logs with optional source/status filters.
 * @param query - URL query suffix e.g. ?status=failed&source=chatwoot
 */
export function useWebhookLogs(query = '?status=failed') {
  return useSWR<{ items: WebhookLogListItem[]; nextCursor: string | null }>(
    `/api/webhook-logs${query}`,
    fetcher,
  );
}
