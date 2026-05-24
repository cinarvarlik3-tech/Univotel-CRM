/**
 * Telegram webhook secret token verification.
 */
import { env } from '@/lib/env';

/**
 * Verifies X-Telegram-Bot-Api-Secret-Token when TELEGRAM_WEBHOOK_SECRET is configured.
 * @param headerValue - Incoming header value.
 * @returns True when verification passes or secret is not configured.
 */
export function verifyTelegramWebhookSecret(headerValue: string | undefined): boolean {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;
  return headerValue === expected;
}
