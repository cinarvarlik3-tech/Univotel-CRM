/**
 * Manager webhook_logs list query — service role (no RLS on webhook_logs).
 */
import { createServiceClient } from '@/lib/supabase/service';

/** Parameters for listing webhook logs. */
export interface ListWebhookLogsParams {
  source?: string;
  /** Single status or comma-separated list (e.g. 'failed,partial,rejected,dropped'). */
  status?: string;
  limit: number;
  cursor?: string;
}

/** Paginated webhook log list result. */
export interface ListWebhookLogsResult {
  items: Array<{
    id: string;
    idempotency_key: string;
    source: string;
    event_type: string;
    status: string;
    reason_code: string | null;
    error_message: string | null;
    retry_count: number;
    processed_at: string | null;
    created_at: string;
  }>;
  nextCursor: string | null;
}

/**
 * Lists webhook_logs with cursor pagination.
 * @param params - Filter and pagination options.
 * @returns Items and next cursor.
 */
export async function listWebhookLogs(
  params: ListWebhookLogsParams,
): Promise<ListWebhookLogsResult> {
  const client = createServiceClient();

  let query = client
    .from('webhook_logs')
    .select(
      'id, idempotency_key, source, event_type, status, reason_code, error_message, retry_count, processed_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(params.limit + 1);

  if (params.source) query = query.eq('source', params.source);
  if (params.status) {
    const statuses = params.status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    query = statuses.length > 1 ? query.in('status', statuses) : query.eq('status', statuses[0]);
  }
  if (params.cursor) query = query.lt('created_at', params.cursor);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch webhook logs: ${error.message}`);
  }

  const rows = data ?? [];
  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.created_at ?? null) : null;

  return { items, nextCursor };
}
