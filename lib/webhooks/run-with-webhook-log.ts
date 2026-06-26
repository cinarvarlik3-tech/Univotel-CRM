/**
 * Wraps webhook processors with webhook_logs idempotency and structured outcomes.
 *
 * The processor returns a WebhookOutcome describing what actually happened
 * (success / ignored / dropped / partial / rejected); a thrown error is recorded
 * as 'failed'. Real problems (failed / partial / rejected) raise a Telegram alert;
 * benign outcomes (success / ignored / dropped) are logged silently for the
 * dashboard. This replaces the old "no throw ⇒ success" behaviour that hid every
 * silent skip and swallowed write.
 */
import { notify } from '@/lib/notifications/notify';
import {
  claimWebhookLog,
  finalizeWebhookLog,
  type WebhookSource,
} from '@/lib/webhooks/webhook-log';
import { ignored, type WebhookOutcome } from '@/lib/webhooks/webhook-outcome';

/** Outcomes that page a manager immediately. dropped is visible in the UI but not alerted (digest territory). */
const ALERT_STATUSES = new Set(['failed', 'partial', 'rejected']);

/**
 * Runs processor after claiming idempotency row; records the structured outcome.
 * @param params - Source metadata and async processor returning a WebhookOutcome.
 */
export async function runWithWebhookLog(params: {
  source: WebhookSource;
  idempotencyKey: string | null;
  eventType: string;
  payload: unknown;
  process: () => Promise<WebhookOutcome>;
  /** When true, skip processor and record an 'ignored' outcome (e.g. non-CDR NetGSM events). */
  skipProcessing?: boolean;
}): Promise<void> {
  if (!params.idempotencyKey) {
    // Phase 4 synthesises a fallback key upstream, so this is a last-resort path
    // with no audit row. Still run the processor; alert on hard failure.
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
    const outcome = ignored('skipped_by_rule', 'Event type not processed by design');
    await finalizeWebhookLog(logId, outcome.status, outcome.detail, outcome.reasonCode);
    return;
  }

  try {
    const outcome = await params.process();
    await finalizeWebhookLog(logId, outcome.status, outcome.detail, outcome.reasonCode);

    if (ALERT_STATUSES.has(outcome.status)) {
      void notify({
        kind: 'webhook_failure',
        suppressible: false,
        source: params.source,
        status: outcome.status as 'rejected' | 'failed' | 'partial',
        reasonCode: outcome.reasonCode ?? null,
        errorMessage: outcome.detail ?? `${params.source}/${params.eventType}`,
        webhookLogId: logId,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finalizeWebhookLog(logId, 'failed', message, 'unhandled_error');
    void notify({
      kind: 'webhook_failure',
      suppressible: false,
      source: params.source,
      status: 'failed',
      reasonCode: 'unhandled_error',
      errorMessage: message,
      webhookLogId: logId,
    });
    throw err;
  }
}
