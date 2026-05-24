/**
 * Idempotency key builders for inbound webhooks (webhook_logs deduplication).
 */
import type { NextApiRequest } from 'next';
import type { WebhookSource } from '@/lib/webhooks/webhook-log';
import { normalizeNetGsmPayload } from '@/lib/webhooks/normalize-netgsm-payload';
import type { ChatwootPayload } from '@/types/webhooks';
import type { WhatsAppWebhookPayload } from '@/types/webhooks';

/**
 * Builds idempotency key for Chatwoot payloads.
 * @param payload - Parsed Chatwoot payload.
 * @param req - Request (timestamp header for conversation_updated).
 * @returns Unique key or null if required fields missing.
 */
export function chatwootIdempotencyKey(
  payload: ChatwootPayload,
  req: NextApiRequest,
): string | null {
  const conversationId = payload.conversation?.id ?? payload.id;

  if (payload.event === 'conversation_updated') {
    const ts =
      (req.headers['x-chatwoot-timestamp'] as string | undefined) ??
      String(Math.floor(Date.now() / 1000));
    return `chatwoot_upd_${conversationId}_${ts}`;
  }

  const messageId = payload.message?.id ?? payload.id;
  return `chatwoot_${conversationId}_${messageId}`;
}

/**
 * Builds idempotency key for WhatsApp Cloud API payloads.
 * @param payload - Parsed WhatsApp webhook payload.
 * @returns Unique key or null.
 */
export function whatsAppIdempotencyKey(payload: WhatsAppWebhookPayload): string | null {
  const value = payload.entry?.[0]?.changes?.[0]?.value;

  const status = value?.statuses?.[0];
  if (status?.id) {
    return `wastatus_${status.id}_${status.status ?? 'unknown'}`;
  }

  const call = value?.calls?.[0];
  if (call?.from) {
    const ts = call.timestamp ?? Date.now();
    return `wacalls_${call.from}_${ts}`;
  }

  return null;
}

/**
 * Builds idempotency key for NetGSM / Netsantral payloads.
 * @param body - Parsed JSON body.
 * @returns Unique key or null.
 */
export function netgsmIdempotencyKey(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;

  const normalized = normalizeNetGsmPayload(body as Record<string, unknown>);
  if (normalized.externalId) {
    return `netgsm_${normalized.externalId}`;
  }

  if (normalized.callerPhone && normalized.scenario) {
    return `netgsm_${normalized.callerPhone}_${normalized.scenario}_${normalized.durationSeconds ?? 0}`;
  }

  return null;
}

/**
 * Resolves event_type string for webhook_logs from parsed payload.
 * @param source - Webhook source identifier.
 * @param body - Parsed JSON body.
 * @returns Event type label.
 */
export function resolveWebhookEventType(source: WebhookSource, body: unknown): string {
  if (!body || typeof body !== 'object') return 'unknown';

  const record = body as Record<string, unknown>;

  if (source === 'chatwoot' && typeof record.event === 'string') {
    return record.event;
  }

  if (source === 'whatsapp_calls') {
    const value = (record.entry as { changes?: { value?: Record<string, unknown> }[] }[])?.[0]
      ?.changes?.[0]?.value;
    if (value?.statuses) return 'message_status';
    if (value?.calls) return 'call_event';
    return 'whatsapp';
  }

  if (source === 'netgsm') {
    const normalized = normalizeNetGsmPayload(record);
    return normalized.scenario ?? 'netgsm';
  }

  return 'unknown';
}
