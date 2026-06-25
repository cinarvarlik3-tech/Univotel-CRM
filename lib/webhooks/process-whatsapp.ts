/**
 * WhatsApp Cloud API webhook router — calls vs message statuses.
 */
import { processWhatsAppCalls } from '@/lib/webhooks/process-whatsapp-calls';
import { processWhatsAppStatuses } from '@/lib/webhooks/process-whatsapp-statuses';
import { WhatsAppWebhookPayloadSchema } from '@/types/webhooks';
import { ignored, rejected, type WebhookOutcome } from '@/lib/webhooks/webhook-outcome';

/**
 * Routes Meta webhook payload to call lead ingestion and/or campaign status updates.
 * @param body - Parsed webhook JSON.
 * @returns Structured webhook outcome (calls take priority over status updates).
 */
export async function processWhatsApp(body: unknown): Promise<WebhookOutcome> {
  const parsed = WhatsAppWebhookPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[whatsapp] invalid payload:', parsed.error.flatten());
    return rejected('schema_invalid', parsed.error.message);
  }

  const value = parsed.data.entry?.[0]?.changes?.[0]?.value;

  // Run status updates (campaign delivery/read) as a side effect; calls are the
  // primary lead-bearing event so its outcome is the one reported.
  let statusOutcome: WebhookOutcome | null = null;
  if (value?.statuses?.length) {
    statusOutcome = await processWhatsAppStatuses(body);
  }

  if (value?.calls?.length) {
    return processWhatsAppCalls(body);
  }

  return statusOutcome ?? ignored('no_actionable_change', 'no calls or message statuses');
}
