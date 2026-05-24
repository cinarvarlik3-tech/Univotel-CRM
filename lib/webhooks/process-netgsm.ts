/**
 * NetGSM / Netsantral webhook processor.
 * Supports CDR (arayan, aranan, sure, kimlik) and santral-dinleme aliases per official docs.
 */
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import { buildNetGsmSourceDetails } from '@/lib/leads/source-details';
import { normalizeNetGsmPayload } from '@/lib/webhooks/normalize-netgsm-payload';
import { verifyNetGsmToken } from '@/lib/webhooks/verify';
import { sendTelegramToManagers } from '@/lib/telegram';
import { NetGsmPayloadSchema } from '@/types/webhooks';

/**
 * Processes a NetGSM webhook payload into a lead when scenario indicates a completed call.
 * @param body - Raw webhook body (unknown until validated).
 */
export async function processNetGsm(body: unknown): Promise<void> {
  const parsed = NetGsmPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[netgsm] invalid payload:', parsed.error.flatten());
    await sendTelegramToManagers(
      `[CRM] NetGSM webhook validation failed.\n${parsed.error.message}`,
    );
    return;
  }

  const record = parsed.data as Record<string, unknown>;
  const normalized = normalizeNetGsmPayload(record);

  if (normalized.token && !verifyNetGsmToken(normalized.token)) {
    console.error('[netgsm] token mismatch');
    return;
  }

  if (!normalized.shouldCreateLead) {
    console.log(
      `[netgsm] skipped lead ingest scenario=${normalized.scenario ?? 'unknown'} id=${normalized.externalId ?? 'n/a'}`,
    );
    return;
  }

  if (!normalized.callerPhone) {
    console.error('[netgsm] missing caller phone in CDR payload');
    await sendTelegramToManagers(
      `[CRM] NetGSM CDR missing caller phone.\nScenario: ${normalized.scenario ?? 'unknown'}`,
    );
    return;
  }

  const externalId = normalized.externalId ?? `netgsm_${Date.now()}`;

  const sourceDetails = buildNetGsmSourceDetails(
    {
      externalId,
      calledNumber: normalized.calledNumber,
      callDuration: normalized.durationSeconds,
    },
    false,
  );

  await createLeadFromWebhook({
    identifierKind: 'phone',
    rawPhone: normalized.callerPhone,
    leadSource: 'netgsm_call',
    messageFrom: 'netgsm',
    sourceDetails,
    interactionSource: 'netgsm',
    metadata: {
      scenario: normalized.scenario,
      netgsm_id: externalId,
    },
  });
}

/**
 * Whether this NetGSM payload should skip lead processing (still logged as skipped).
 * @param body - Parsed webhook JSON.
 * @returns True to skip processor after auth.
 */
export function shouldSkipNetGsmLead(body: unknown): boolean {
  if (!body || typeof body !== 'object') return true;
  const normalized = normalizeNetGsmPayload(body as Record<string, unknown>);
  if (normalized.token && !verifyNetGsmToken(normalized.token)) return true;
  return !normalized.shouldCreateLead;
}
