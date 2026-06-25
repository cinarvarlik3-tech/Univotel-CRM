/**
 * Replays a retryable webhook from stored payload.
 */
import { processChatwoot } from '@/lib/webhooks/process-chatwoot';
import { processNetGsm } from '@/lib/webhooks/process-netgsm';
import { processWhatsApp } from '@/lib/webhooks/process-whatsapp';
import { finalizeWebhookLog, markWebhookLogReplay } from '@/lib/webhooks/webhook-log';
import { createServiceClient } from '@/lib/supabase/service';
import { isReplayable, ok, type WebhookOutcome } from '@/lib/webhooks/webhook-outcome';

/** Thrown (and matched by the API route) when a row's status isn't replayable. */
export const NOT_REPLAYABLE_MESSAGE = 'This webhook is not replayable';

/**
 * Replays a retryable webhook_logs row (failed / partial / dropped) by id, and
 * records the fresh outcome so the row reflects the replay result.
 * @param logId - webhook_logs.id.
 * @throws Error when log not found, not replayable, or processor fails.
 */
export async function replayWebhookLog(logId: string): Promise<void> {
  const client = createServiceClient();
  const { data: row, error } = await client
    .from('webhook_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (error) throw new Error('Failed to load webhook log');
  if (!row) throw new Error('Webhook log not found');
  if (!isReplayable(row.status)) throw new Error(NOT_REPLAYABLE_MESSAGE);

  await markWebhookLogReplay(logId);

  try {
    const payload = row.payload;
    let outcome: WebhookOutcome = ok('replayed', 'Replayed — source had no processor');

    if (row.source === 'chatwoot') {
      outcome = await processChatwoot(payload);
    } else if (row.source === 'netgsm') {
      outcome = await processNetGsm(payload);
    } else if (row.source === 'whatsapp_calls') {
      outcome = await processWhatsApp(payload);
    }

    await finalizeWebhookLog(logId, outcome.status, outcome.detail, outcome.reasonCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finalizeWebhookLog(logId, 'failed', message, 'unhandled_error');
    throw err;
  }
}
