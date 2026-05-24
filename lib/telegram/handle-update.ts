/**
 * Telegram bot update processor — /start, /chatid, and /link commands.
 */
import { linkTelegramSalesperson } from '@/lib/jobs/link-telegram-salesperson';
import { sendTelegramApiMessage } from '@/lib/telegram/api';

/** Minimal Telegram Update object for message commands. */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
  };
}

/**
 * Processes an inbound Telegram webhook update.
 * @param update - Parsed Telegram Update JSON.
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.chat?.id) return;

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const command = text.split(/\s+/)[0]?.toLowerCase();

  if (command === '/start') {
    await sendTelegramApiMessage(
      chatId,
      [
        'Univotel CRM botuna hoş geldiniz.',
        '',
        `Chat ID: ${chatId}`,
        '',
        "Manager bildirimleri için bu ID'yi TELEGRAM_MANAGER_CHAT_IDS ortam değişkenine ekleyin.",
        '',
        'Satış temsilcisi görev bildirimleri için: /link sizin@email.com',
      ].join('\n'),
    );
    return;
  }

  if (command === '/chatid') {
    await sendTelegramApiMessage(chatId, `Chat ID: ${chatId}`);
    return;
  }

  if (command === '/link') {
    await handleLinkCommand(chatId, text);
  }
}

/**
 * Links a salesperson CRM profile to their Telegram chat ID by email.
 * @param chatId - Telegram chat ID string.
 * @param text - Full message text including /link and email.
 */
async function handleLinkCommand(chatId: string, text: string): Promise<void> {
  const parts = text.split(/\s+/);
  const email = parts[1]?.trim();

  if (!email) {
    await sendTelegramApiMessage(
      chatId,
      "Kullanım: /link sizin@email.com\nCRM'deki satış temsilcisi e-posta adresinizi girin.",
    );
    return;
  }

  const result = await linkTelegramSalesperson(chatId, email);

  if (!result.ok) {
    const suffix =
      result.reason === 'already_linked'
        ? '\nYönetici değişiklik yapmalı.'
        : result.reason === 'not_found'
          ? '\nYöneticinizle iletişime geçin.'
          : '';
    await sendTelegramApiMessage(chatId, `${result.message}${suffix}`);
    return;
  }

  await sendTelegramApiMessage(
    chatId,
    `Başarılı! ${result.fullName} (${result.email}) hesabınız Telegram ile bağlandı.\nGörev bildirimleri bu sohbete gelecek.`,
  );
}
