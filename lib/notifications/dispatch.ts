/**
 * Channel-agnostic notification dispatcher.
 * Currently backed by Telegram; the interface is intentionally transport-neutral
 * so in-app or email channels can be added without touching callers.
 *
 * Kill switch: reads cron_settings.notifications_enabled at send time.
 * - null / absent / 'true'  → notifications on (default)
 * - 'false'                 → suppressible events are dropped; webhook_failure always sends
 */
import { createServiceClient } from '@/lib/supabase/service';
import { deliverTelegramToChatIds } from '@/lib/telegram/deliver';

async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const client = createServiceClient();
    const { data } = await client
      .from('cron_settings')
      .select('value')
      .eq('key', 'notifications_enabled')
      .maybeSingle();
    return data?.value !== 'false';
  } catch {
    return true;
  }
}

/**
 * Sends a message to a set of recipients.
 * Silently skips empty recipient lists.
 * When suppressible is true (default), respects the global notifications kill switch.
 * When suppressible is false (webhook_failure), always sends.
 */
export async function dispatch(
  chatIds: string[],
  message: string,
  suppressible = true,
): Promise<void> {
  if (chatIds.length === 0) return;

  if (suppressible) {
    const enabled = await isNotificationsEnabled();
    if (!enabled) return;
  }

  await deliverTelegramToChatIds(chatIds, message);
}
