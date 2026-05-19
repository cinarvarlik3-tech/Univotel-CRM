/**
 * Telegram alert sender for SLA breaches, unassigned leads, and system errors.
 * Failures are swallowed — Telegram must never cascade errors to callers.
 */
import { env, getManagerChatIds } from '@/lib/env';

/**
 * Sends a Telegram message to a specific chat ID.
 * @param chatId - Telegram chat ID.
 * @param message - Message text to send.
 */
async function sendMessage(chatId: string, message: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  } catch (err) {
    console.error('[telegram] alert failed:', err);
  }
}

/**
 * Sends a Telegram alert to a single chat ID.
 * @param message - Alert message text.
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  const chatIds = getManagerChatIds();
  if (chatIds.length === 0) return;
  await sendMessage(chatIds[0], message);
}

/**
 * Sends a Telegram alert to all configured manager chat IDs.
 * @param message - Alert message text.
 */
export async function sendTelegramToManagers(message: string): Promise<void> {
  const chatIds = getManagerChatIds();
  await Promise.all(chatIds.map((chatId) => sendMessage(chatId, message)));
}

/**
 * Sends a Telegram alert to a specific salesperson.
 * @param chatId - Salesperson Telegram chat ID.
 * @param message - Alert message text.
 */
export async function sendTelegramToSalesperson(chatId: string, message: string): Promise<void> {
  await sendMessage(chatId, message);
}
