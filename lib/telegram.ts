/**
 * Telegram alert sender for SLA breaches, unassigned leads, and system errors.
 * Failures are swallowed — Telegram must never cascade errors to callers.
 */
import { sendManagerNotification } from '@/lib/notifications/send-manager-alert';
import { getManagerChatIds } from '@/lib/env';
import { deliverTelegramMessage, deliverTelegramToChatIds } from '@/lib/telegram/deliver';

/**
 * Sends a Telegram alert with webhook_failure throttle and audit logging.
 * @param message - Alert message text.
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  await sendManagerNotification({ alertType: 'webhook_failure', message });
}

/**
 * Sends a Telegram alert to all configured manager chat IDs (no throttle).
 * @param message - Alert message text.
 */
export async function sendTelegramToManagers(message: string): Promise<void> {
  const chatIds = getManagerChatIds();
  await deliverTelegramToChatIds(chatIds, message);
}

/**
 * Sends a Telegram alert to a specific salesperson.
 * @param chatId - Salesperson Telegram chat ID.
 * @param message - Alert message text.
 */
export async function sendTelegramToSalesperson(chatId: string, message: string): Promise<void> {
  await deliverTelegramMessage(chatId, message);
}
