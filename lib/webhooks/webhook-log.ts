/**
 * webhook_logs persistence — Phase 2 idempotency and audit trail for inbound webhooks.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/types/database';

/** Supported inbound webhook sources. */
export type WebhookSource = 'chatwoot' | 'netgsm' | 'whatsapp_calls';

/** webhook_logs.status values. */
export type WebhookLogStatus = 'received' | 'processing' | 'success' | 'failed' | 'skipped';

/** Result of claiming a webhook in webhook_logs. */
export type ClaimWebhookResult =
  | { type: 'new'; logId: string }
  | { type: 'duplicate' }
  | { type: 'error'; message: string };

/**
 * Inserts a webhook_logs row for idempotency. Duplicate keys return duplicate without throwing.
 * @param params - Log row fields.
 * @returns Claim result.
 */
export async function claimWebhookLog(params: {
  idempotencyKey: string;
  source: WebhookSource;
  eventType: string;
  payload: unknown;
}): Promise<ClaimWebhookResult> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('webhook_logs')
    .insert({
      idempotency_key: params.idempotencyKey,
      source: params.source,
      event_type: params.eventType,
      status: 'processing',
      payload: params.payload as Json,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { type: 'duplicate' };
    }
    return { type: 'error', message: error.message };
  }

  return { type: 'new', logId: data.id };
}

/**
 * Updates webhook_logs status after processing completes.
 * @param logId - webhook_logs.id.
 * @param status - Final status.
 * @param errorMessage - Optional error text when failed.
 */
export async function finalizeWebhookLog(
  logId: string,
  status: Exclude<WebhookLogStatus, 'received' | 'processing'>,
  errorMessage?: string | null,
): Promise<void> {
  const client = createServiceClient();

  await client
    .from('webhook_logs')
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

/**
 * Increments retry_count and sets status back to processing for manual replay.
 * @param logId - webhook_logs.id.
 */
export async function markWebhookLogReplay(logId: string): Promise<void> {
  const client = createServiceClient();

  const { data: row } = await client
    .from('webhook_logs')
    .select('retry_count')
    .eq('id', logId)
    .single();

  await client
    .from('webhook_logs')
    .update({
      status: 'processing',
      error_message: null,
      processed_at: null,
      retry_count: (row?.retry_count ?? 0) + 1,
    })
    .eq('id', logId);
}
