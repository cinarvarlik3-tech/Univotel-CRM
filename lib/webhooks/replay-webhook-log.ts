/**
 * Replays a failed webhook from stored payload.
 */
import { processChatwoot } from '@/lib/webhooks/process-chatwoot';
import { processNetGsm } from '@/lib/webhooks/process-netgsm';
import { processWhatsApp } from '@/lib/webhooks/process-whatsapp';
import { finalizeWebhookLog, markWebhookLogReplay } from '@/lib/webhooks/webhook-log';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Replays a failed webhook_logs row by id.
 * @param logId - webhook_logs.id.
 * @throws Error when log not found, not failed, or processor fails.
 */
export async function replayWebhookLog(logId: string): Promise<void> {
  const client = createServiceClient();
  const { data: row, error } = await client
    .from('webhook_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (error) throw new Error('Failed to load webhook log');
  if (!row) throw new Error('Webhook log not found');
  if (row.status !== 'failed') throw new Error('Only failed webhooks can be replayed');

  await markWebhookLogReplay(logId);

  try {
    const payload = row.payload;

    if (row.source === 'chatwoot') {
      await processChatwoot(payload);
    } else if (row.source === 'netgsm') {
      await processNetGsm(payload);
    } else if (row.source === 'whatsapp_calls') {
      await processWhatsApp(payload);
    }

    await finalizeWebhookLog(logId, 'success');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finalizeWebhookLog(logId, 'failed', message);
    throw err;
  }
}
