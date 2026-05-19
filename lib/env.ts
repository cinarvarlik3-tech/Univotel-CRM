/**
 * Environment variable validation using Zod.
 * Application fails fast on startup if required configuration is missing.
 */
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_PROJECT_ID: z.string().min(1).optional(),
  CHATWOOT_WEBHOOK_SECRET: z.string().min(1),
  WHATSAPP_WEBHOOK_SECRET: z.string().min(1),
  NETGSM_STATIC_TOKEN: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_MANAGER_CHAT_IDS: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CF_REQUIRE_SUPABASE: z.string().optional(),
  CRON_SECRET: z.string().min(32),
});

/**
 * Parsed and validated environment variables.
 * @throws ZodError if any required variable is missing or invalid.
 */
export const env = envSchema.parse(process.env);

/**
 * Returns manager Telegram chat IDs parsed from comma-separated env var.
 * @returns Array of chat ID strings.
 */
export function getManagerChatIds(): string[] {
  return env.TELEGRAM_MANAGER_CHAT_IDS.split(',').map((id) => id.trim()).filter(Boolean);
}
