/**
 * NetGSM webhook processor — STUB.
 * BLOCKED: Awaiting complete CDR field mapping from teknikdestek@netgsm.com.tr
 * Do not insert leads until field names are confirmed.
 */
import { sendTelegramToManagers } from '@/lib/telegram';
import { NetGsmPayloadSchema } from '@/types/webhooks';

/**
 * Processes a NetGSM webhook payload (stub — logs and alerts only).
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

  console.log('[netgsm] stub received payload:', JSON.stringify(parsed.data));

  await sendTelegramToManagers(
    `[CRM] NetGSM webhook received — processor stub, awaiting field mapping.\nPayload keys: ${Object.keys(parsed.data).join(', ')}`,
  );
}
