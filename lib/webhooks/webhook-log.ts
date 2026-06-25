/**
 * webhook_logs persistence — Phase 2 idempotency and audit trail for inbound webhooks.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/types/database';

/** Supported inbound webhook sources. */
export type WebhookSource = 'chatwoot' | 'netgsm' | 'whatsapp_calls';

/** webhook_logs.status values. */
export type WebhookLogStatus =
  | 'received'
  | 'processing'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'ignored'
  | 'dropped'
  | 'partial'
  | 'rejected';

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
 * @param detail - Optional human-readable detail (stored in error_message).
 * @param reasonCode - Optional machine-readable sub-reason.
 */
export async function finalizeWebhookLog(
  logId: string,
  status: Exclude<WebhookLogStatus, 'received' | 'processing'>,
  detail?: string | null,
  reasonCode?: string | null,
): Promise<void> {
  const client = createServiceClient();

  await client
    .from('webhook_logs')
    .update({
      status,
      error_message: detail ?? null,
      reason_code: reasonCode ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

/**
 * Inserts an already-finalized webhook_logs row for transport-level outcomes that
 * bypass the claim/process flow (e.g. signature failures). Deduped by idempotency
 * key so repeated identical probes don't flood the table.
 * @param params - Log fields including final status.
 */
export async function recordTerminalWebhookLog(params: {
  idempotencyKey: string;
  source: WebhookSource;
  eventType: string;
  payload: unknown;
  status: Exclude<WebhookLogStatus, 'received' | 'processing'>;
  reasonCode: string;
  detail?: string | null;
}): Promise<void> {
  const client = createServiceClient();
  const { error } = await client.from('webhook_logs').insert({
    idempotency_key: params.idempotencyKey,
    source: params.source,
    event_type: params.eventType,
    status: params.status,
    reason_code: params.reasonCode,
    error_message: params.detail ?? null,
    payload: params.payload as Json,
    processed_at: new Date().toISOString(),
  });

  // 23505 = duplicate idempotency key — identical probe already logged, ignore.
  if (error && error.code !== '23505') {
    console.error('[webhook] terminal log insert failed:', error.message);
  }
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
