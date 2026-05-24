/**
 * Registers the CRM Telegram bot webhook with Telegram Bot API.
 * Run: pnpm exec tsx scripts/setup-telegram-webhook.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

/** Loads .env then .env.local before importing lib/env. */
function loadEnvFiles(): void {
  const root = process.cwd();
  config({ path: resolve(root, '.env') });
  config({ path: resolve(root, '.env.local'), override: true });
}

loadEnvFiles();

async function main(): Promise<void> {
  const { env } = await import('../lib/env');
  const { getTelegramWebhookInfo, setTelegramWebhook, verifyTelegramBotToken } =
    await import('../lib/telegram/api');

  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/webhooks/telegram`;
  const secret = env.TELEGRAM_WEBHOOK_SECRET;

  const bot = await verifyTelegramBotToken();
  if (!bot.ok) {
    throw new Error(`Invalid TELEGRAM_BOT_TOKEN: ${bot.error}`);
  }

  console.log(`Bot: @${bot.username}`);
  console.log(`Registering webhook: ${webhookUrl}`);

  await setTelegramWebhook(webhookUrl, secret);

  const info = await getTelegramWebhookInfo();
  console.log('Webhook registered:');
  console.log(`  url: ${info.url}`);
  console.log(`  pending updates: ${info.pendingUpdateCount}`);
  if (info.lastErrorMessage) {
    console.warn(`  last error: ${info.lastErrorMessage}`);
  }
  if (!secret) {
    console.warn('TELEGRAM_WEBHOOK_SECRET is not set — webhook accepts unsigned requests.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
