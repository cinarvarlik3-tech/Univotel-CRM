/**
 * Factory for inbound webhook API routes — raw body, HMAC verify, await processing, then 200.
 *
 * The HTTP response is always 200 for accepted payloads (providers retry on non-2xx,
 * which would just storm us); observability lives in webhook_logs, not the status code.
 * Verification failures and events without a derivable idempotency key are still logged
 * so nothing processes — or gets rejected — without an audit trail.
 */
import { createHash } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveWebhookEventType } from '@/lib/webhooks/idempotency-key';
import { recordTerminalWebhookLog, type WebhookSource } from '@/lib/webhooks/webhook-log';
import { readRawBody } from '@/lib/webhooks/read-raw-body';
import { runWithWebhookLog } from '@/lib/webhooks/run-with-webhook-log';
import type { WebhookOutcome } from '@/lib/webhooks/webhook-outcome';

/** Options for createWebhookHandler factory. */
export interface WebhookHandlerOptions {
  source: WebhookSource;
  verify: (rawBody: string, req: NextApiRequest) => Promise<boolean>;
  getIdempotencyKey: (parsed: unknown, req: NextApiRequest) => string | null;
  process: (parsed: unknown) => Promise<WebhookOutcome>;
  /** When true, log an 'ignored' outcome but skip the processor (events handled by design as no-ops). */
  shouldSkipProcessing?: (parsed: unknown) => boolean;
}

/** Stable fallback idempotency key derived from the raw body, so every event is logged. */
function bodyHashKey(source: string, rawBody: string): string {
  const hash = createHash('sha256').update(rawBody).digest('hex').slice(0, 32);
  return `${source}:body:${hash}`;
}

/**
 * Creates a Next.js API handler for POST webhooks with shared Phase 2 flow.
 * @param options - Source-specific verify, keys, and processor.
 * @returns Next.js API route handler.
 */
export function createWebhookHandler(options: WebhookHandlerOptions) {
  return async function webhookHandler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }

    const rawBody = await readRawBody(req);
    const valid = await options.verify(rawBody, req);

    if (!valid) {
      // Surface verification failures (provider misconfig or spoof attempts) instead
      // of swallowing them on a bare 401. Deduped by body hash.
      await recordTerminalWebhookLog({
        idempotencyKey: bodyHashKey(options.source, rawBody),
        source: options.source,
        eventType: 'unauthorized',
        payload: { _raw: rawBody.slice(0, 2000) },
        status: 'rejected',
        reasonCode: 'unauthorized',
        detail: 'Signature/token verification failed',
      });
      res.status(401).end();
      return;
    }

    let parsed: unknown;

    try {
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      parsed = { _raw: rawBody };
    }

    const eventType = resolveWebhookEventType(options.source, parsed);
    // Fall back to a body-hash key when the payload shape has no natural key, so the
    // event still gets an audit row (previously these processed with no log at all).
    const idempotencyKey =
      options.getIdempotencyKey(parsed, req) ?? bodyHashKey(options.source, rawBody);
    const skipProcessing = options.shouldSkipProcessing?.(parsed) ?? false;

    try {
      await runWithWebhookLog({
        source: options.source,
        idempotencyKey,
        eventType,
        payload: parsed,
        skipProcessing,
        process: () => options.process(parsed),
      });
    } catch (err) {
      console.error(`[webhook:${options.source}] processing failed:`, err);
    }

    res.status(200).end();
  };
}

/** Next.js config: disable body parser for HMAC verification on raw body. */
export const webhookApiConfig = {
  api: { bodyParser: false as const },
};
