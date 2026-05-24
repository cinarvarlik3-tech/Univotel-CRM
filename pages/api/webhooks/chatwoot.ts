/**
 * Chatwoot webhook endpoint — HMAC verify, idempotent async processing.
 */
import { createWebhookHandler } from '@/lib/webhooks/create-webhook-handler';
import { chatwootIdempotencyKey } from '@/lib/webhooks/idempotency-key';
import { processChatwoot } from '@/lib/webhooks/process-chatwoot';
import { verifyChatwootSignature } from '@/lib/webhooks/verify';
import { ChatwootPayloadSchema } from '@/types/webhooks';

const handler = createWebhookHandler({
  source: 'chatwoot',
  verify: (rawBody, req) =>
    verifyChatwootSignature(
      rawBody,
      req.headers['x-chatwoot-signature'] as string | undefined,
      req.headers['x-chatwoot-timestamp'] as string | undefined,
    ),
  getIdempotencyKey: (parsed, req) => {
    const result = ChatwootPayloadSchema.safeParse(parsed);
    if (!result.success) return `chatwoot_invalid_${Date.now()}`;
    return chatwootIdempotencyKey(result.data, req);
  },
  process: (parsed) => processChatwoot(parsed),
});

export default handler;
export const config = {
  api: {
    bodyParser: false,
  },
};
