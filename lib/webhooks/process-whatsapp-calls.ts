/**
 * WhatsApp Cloud API call webhook processor.
 * Handles incoming call events from Meta WA Cloud API.
 */
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import { buildWhatsAppCallSourceDetails } from '@/lib/leads/source-details';
import { sendTelegramToManagers } from '@/lib/telegram';
import { WhatsAppCallPayloadSchema } from '@/types/webhooks';

/**
 * Processes a WhatsApp call webhook payload into a lead or duplicate record.
 * @param body - Raw webhook body (unknown until validated).
 */
export async function processWhatsAppCalls(body: unknown): Promise<void> {
  const parsed = WhatsAppCallPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[whatsapp-calls] invalid payload:', parsed.error.flatten());
    await sendTelegramToManagers(
      `[CRM] WhatsApp call webhook validation failed.\n${parsed.error.message}`,
    );
    return;
  }

  const payload = parsed.data;
  const call = payload.entry?.[0]?.changes?.[0]?.value?.calls?.[0];

  if (!call?.from) {
    console.error('[whatsapp-calls] missing caller in payload');
    return;
  }

  const externalId = `call_${call.from}_${call.timestamp ?? Date.now()}`;
  const sourceDetails = buildWhatsAppCallSourceDetails(
    {
      externalId,
      callDuration: call.duration ?? null,
    },
    false,
  );

  await createLeadFromWebhook({
    identifierKind: 'phone',
    rawPhone: call.from,
    leadSource: 'whatsapp_call',
    messageFrom: 'whatsapp',
    sourceDetails,
    interactionSource: 'whatsapp',
    metadata: { wa_call_id: call.id, status: call.status },
  });
}
