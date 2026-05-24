/**
 * WhatsApp Cloud API webhook router — calls vs message statuses.
 */
import { processWhatsAppCalls } from '@/lib/webhooks/process-whatsapp-calls';
import { processWhatsAppStatuses } from '@/lib/webhooks/process-whatsapp-statuses';
import { WhatsAppWebhookPayloadSchema } from '@/types/webhooks';

/**
 * Routes Meta webhook payload to call lead ingestion and/or campaign status updates.
 * @param body - Parsed webhook JSON.
 */
export async function processWhatsApp(body: unknown): Promise<void> {
  const parsed = WhatsAppWebhookPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[whatsapp] invalid payload:', parsed.error.flatten());
    return;
  }

  const value = parsed.data.entry?.[0]?.changes?.[0]?.value;

  if (value?.statuses?.length) {
    await processWhatsAppStatuses(body);
  }

  if (value?.calls?.length) {
    await processWhatsAppCalls(body);
  }
}
