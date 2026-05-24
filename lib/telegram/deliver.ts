/**
 * Low-level Telegram HTTP delivery — no throttle or audit logging.
 */
import { sendTelegramApiMessage } from '@/lib/telegram/api';

/** Per-recipient delivery outcome. */
export type TelegramDeliveryResult =
  | { ok: true; chatId: string; messageId: number; telegramChatId: number }
  | { ok: false; chatId: string; errorCode: number; description: string };

/**
 * Sends a Telegram message to a specific chat ID.
 * @param chatId - Telegram chat ID.
 * @param message - Message text to send.
 */
export async function deliverTelegramMessage(
  chatId: string,
  message: string,
): Promise<TelegramDeliveryResult> {
  const result = await sendTelegramApiMessage(chatId, message);

  if (!result.ok) {
    console.error(`[telegram] send failed chat=${chatId}: ${result.description}`);
    return { ok: false, chatId, errorCode: result.errorCode, description: result.description };
  }

  return {
    ok: true,
    chatId,
    messageId: result.messageId,
    telegramChatId: result.telegramChatId,
  };
}

/**
 * Sends a message to all given chat IDs in parallel.
 * @param chatIds - Recipient chat IDs.
 * @param message - Message text.
 */
export async function deliverTelegramToChatIds(
  chatIds: string[],
  message: string,
): Promise<TelegramDeliveryResult[]> {
  return Promise.all(chatIds.map((chatId) => deliverTelegramMessage(chatId, message)));
}
