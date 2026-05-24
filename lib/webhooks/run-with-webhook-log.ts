/**
 * Wraps webhook processors with webhook_logs idempotency and status updates.
 */
import { sendTelegramAlert } from '@/lib/telegram';
import {
  claimWebhookLog,
  finalizeWebhookLog,
  type WebhookSource,
} from '@/lib/webhooks/webhook-log';

/**
 * Runs processor after claiming idempotency row; updates log status on completion.
 * @param params - Source metadata and async processor.
 */
export async function runWithWebhookLog(params: {
  source: WebhookSource;
  idempotencyKey: string | null;
  eventType: string;
  payload: unknown;
  process: () => Promise<void>;
  /** When true, skip processor but mark success (e.g. non-CDR NetGSM events). */
  skipProcessing?: boolean;
}): Promise<void> {
  if (!params.idempotencyKey) {
    console.error(`[webhook:${params.source}] missing idempotency key, event=${params.eventType}`);
    try {
      await params.process();
    } catch (err) {
      console.error(`[webhook:${params.source}] processing failed:`, err);
    }
    return;
  }

  const claim = await claimWebhookLog({
    idempotencyKey: params.idempotencyKey,
    source: params.source,
    eventType: params.eventType,
    payload: params.payload,
  });

  if (claim.type === 'duplicate') {
    return;
  }

  if (claim.type === 'error') {
    console.error(`[webhook:${params.source}] log insert failed:`, claim.message);
    try {
      await params.process();
    } catch (err) {
      console.error(`[webhook:${params.source}] processing failed:`, err);
    }
    return;
  }

  const logId = claim.logId;

  if (params.skipProcessing) {
    await finalizeWebhookLog(logId, 'skipped');
    return;
  }

  try {
    await params.process();
    await finalizeWebhookLog(logId, 'success');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finalizeWebhookLog(logId, 'failed', message);
    await sendTelegramAlert(
      `[CRM] Webhook failed (${params.source} / ${params.eventType})\nLog: ${logId}\nError: ${message}`,
    );
    throw err;
  }
}
