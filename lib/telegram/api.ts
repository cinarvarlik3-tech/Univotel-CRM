/**
 * Telegram Bot API client — sendMessage, setWebhook, and webhook introspection.
 */
import { env } from '@/lib/env';

/** Telegram Bot API error payload. */
export interface TelegramApiError {
  ok: false;
  error_code: number;
  description: string;
}

/** Successful sendMessage response. */
export interface TelegramSendMessageSuccess {
  ok: true;
  result: {
    message_id: number;
    chat: { id: number };
  };
}

/** Union of Telegram API responses used by this module. */
export type TelegramApiResponse = TelegramSendMessageSuccess | TelegramApiError;

/** Result of a sendMessage attempt. */
export type TelegramSendResult =
  | { ok: true; messageId: number; telegramChatId: number }
  | { ok: false; errorCode: number; description: string };

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Builds the bot-scoped Telegram API URL for a method.
 * @param method - Bot API method name (e.g. sendMessage).
 */
function botApiUrl(method: string): string {
  return `${TELEGRAM_API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

/**
 * Performs an authenticated Telegram Bot API request.
 * @param method - Bot API method name.
 * @param body - JSON request body.
 */
async function telegramRequest<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(botApiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as T & { ok?: boolean; description?: string };

  if (!res.ok || json.ok === false) {
    const description =
      typeof json.description === 'string' ? json.description : `HTTP ${res.status}`;
    throw new Error(`Telegram ${method} failed: ${description}`);
  }

  return json;
}

/**
 * Sends a text message to a Telegram chat.
 * @param chatId - Target chat ID.
 * @param message - Message text (MarkdownV2 not used — plain text).
 */
export async function sendTelegramApiMessage(
  chatId: string,
  message: string,
): Promise<TelegramSendResult> {
  try {
    const json = await telegramRequest<TelegramSendMessageSuccess>('sendMessage', {
      chat_id: chatId,
      text: message,
    });

    return {
      ok: true,
      messageId: json.result.message_id,
      telegramChatId: json.result.chat.id,
    };
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    const match = messageText.match(/Telegram sendMessage failed: (.+)/);
    return {
      ok: false,
      errorCode: 0,
      description: match?.[1] ?? messageText,
    };
  }
}

/**
 * Registers the CRM webhook URL with Telegram.
 * @param webhookUrl - Public HTTPS URL for inbound updates.
 * @param secretToken - Optional secret sent in X-Telegram-Bot-Api-Secret-Token header.
 */
export async function setTelegramWebhook(webhookUrl: string, secretToken?: string): Promise<void> {
  await telegramRequest('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message'],
    drop_pending_updates: true,
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
}

/**
 * Returns current webhook configuration from Telegram.
 */
export async function getTelegramWebhookInfo(): Promise<{
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  lastErrorMessage?: string;
}> {
  const json = await telegramRequest<{
    ok: true;
    result: {
      url: string;
      has_custom_certificate: boolean;
      pending_update_count: number;
      last_error_message?: string;
    };
  }>('getWebhookInfo');

  return {
    url: json.result.url,
    hasCustomCertificate: json.result.has_custom_certificate,
    pendingUpdateCount: json.result.pending_update_count,
    lastErrorMessage: json.result.last_error_message,
  };
}

/**
 * Verifies bot token validity via getMe.
 */
export async function verifyTelegramBotToken(): Promise<
  { ok: true; username: string } | { ok: false; error: string }
> {
  try {
    const json = await telegramRequest<{
      ok: true;
      result: { username?: string };
    }>('getMe');

    return { ok: true, username: json.result.username ?? 'unknown' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
