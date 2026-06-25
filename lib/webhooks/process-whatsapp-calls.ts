/**
 * WhatsApp Cloud API call webhook processor.
 * Handles incoming call events from Meta WA Cloud API.
 */
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import { buildWhatsAppCallSourceDetails } from '@/lib/leads/source-details';
import { WhatsAppCallPayloadSchema } from '@/types/webhooks';
import { dropped, ok, rejected, type WebhookOutcome } from '@/lib/webhooks/webhook-outcome';

/**
 * Processes a WhatsApp call webhook payload into a lead or duplicate record.
 * @param body - Raw webhook body (unknown until validated).
 * @returns Structured webhook outcome.
 */
export async function processWhatsAppCalls(body: unknown): Promise<WebhookOutcome> {
  const parsed = WhatsAppCallPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[whatsapp-calls] invalid payload:', parsed.error.flatten());
    return rejected('schema_invalid', parsed.error.message);
  }

  const payload = parsed.data;
  const call = payload.entry?.[0]?.changes?.[0]?.value?.calls?.[0];

  if (!call?.from) {
    console.error('[whatsapp-calls] missing caller in payload');
    return dropped('missing_caller', 'WhatsApp call payload has no caller');
  }

  const externalId = `call_${call.from}_${call.timestamp ?? Date.now()}`;
  const sourceDetails = buildWhatsAppCallSourceDetails(
    {
      externalId,
      callDuration: call.duration ?? null,
    },
    false,
  );

  const result = await createLeadFromWebhook({
    identifierKind: 'phone',
    rawPhone: call.from,
    leadSource: 'whatsapp_call',
    messageFrom: 'whatsapp',
    sourceDetails,
    interactionSource: 'whatsapp',
    metadata: { wa_call_id: call.id, status: call.status },
  });

  // Existing-lead WhatsApp calls fall through to dedupe and are NOT recorded as a
  // call on the lead — surface that as a dropped outcome rather than a silent success.
  if (result.type === 'duplicate') {
    return dropped('call_not_recorded', `existing lead=${result.existingUuid} — call not recorded`);
  }
  return ok('lead_created', `new lead from WhatsApp call ${call.from}`);
}
