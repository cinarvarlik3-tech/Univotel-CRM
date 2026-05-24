/**
 * Factory for inbound webhook API routes — raw body, HMAC verify, await processing, then 200.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveWebhookEventType } from '@/lib/webhooks/idempotency-key';
import type { WebhookSource } from '@/lib/webhooks/webhook-log';
import { readRawBody } from '@/lib/webhooks/read-raw-body';
import { runWithWebhookLog } from '@/lib/webhooks/run-with-webhook-log';

/** Options for createWebhookHandler factory. */
export interface WebhookHandlerOptions {
  source: WebhookSource;
  verify: (rawBody: string, req: NextApiRequest) => Promise<boolean>;
  getIdempotencyKey: (parsed: unknown, req: NextApiRequest) => string | null;
  process: (parsed: unknown) => Promise<void>;
  /** When true, log success but skip processor (ignored events). */
  shouldSkipProcessing?: (parsed: unknown) => boolean;
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
    const idempotencyKey = options.getIdempotencyKey(parsed, req);
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
