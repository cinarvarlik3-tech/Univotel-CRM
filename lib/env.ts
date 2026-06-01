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
  CHATWOOT_BASE_URL: z.string().url().default('https://marketinguni.app'),
  CHATWOOT_API_TOKEN: z.string().min(1).optional(),
  CHATWOOT_ACCOUNT_ID: z.coerce.number().int().positive().optional(),
  CHATWOOT_SYNC_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  CHATWOOT_ASSIGNEE_SYNC_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  CHATWOOT_LABEL_SYNC_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  CHATWOOT_SYNC_ECHO_WINDOW_MS: z.coerce.number().int().nonnegative().default(10_000),
  WHATSAPP_WEBHOOK_SECRET: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_API_TOKEN: z.string().min(1),
  NETGSM_STATIC_TOKEN: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_MANAGER_CHAT_IDS: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CF_REQUIRE_SUPABASE: z.string().optional(),
  CRON_SECRET: z.string().min(32),
  MAKE_WEBHOOK_URL: z.string().url(),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  GA4_PROPERTY_ID: z.string().min(1).optional(),
});

const parsed = envSchema.parse({
  ...process.env,
  CHATWOOT_API_TOKEN: process.env.CHATWOOT_API_TOKEN ?? process.env.CHATWOOT_PERSONAL_ACCESS_TOKEN,
});

/**
 * Parsed and validated environment variables.
 */
export const env = parsed;

/**
 * Returns true when Chatwoot API token and account id are configured.
 */
export function isChatwootApiConfigured(): boolean {
  return Boolean(env.CHATWOOT_API_TOKEN) && Boolean(env.CHATWOOT_ACCOUNT_ID);
}

/**
 * Returns true when master Chatwoot two-way sync is enabled and API is configured.
 */
export function isChatwootSyncEnabled(): boolean {
  return env.CHATWOOT_SYNC_ENABLED && isChatwootApiConfigured();
}

/**
 * Returns true when Chatwoot assignee two-way sync is enabled and configured.
 */
export function isChatwootAssigneeSyncEnabled(): boolean {
  return isChatwootSyncEnabled() && env.CHATWOOT_ASSIGNEE_SYNC_ENABLED;
}

/**
 * Returns true when Chatwoot label two-way sync is enabled and configured.
 */
export function isChatwootLabelSyncEnabled(): boolean {
  return isChatwootSyncEnabled() && env.CHATWOOT_LABEL_SYNC_ENABLED;
}

/**
 * Returns manager Telegram chat IDs parsed from comma-separated env var.
 * @returns Array of chat ID strings.
 */
export function getManagerChatIds(): string[] {
  return env.TELEGRAM_MANAGER_CHAT_IDS.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Returns true when GA4 Data API credentials are configured.
 */
export function isGa4Configured(): boolean {
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON) && Boolean(env.GA4_PROPERTY_ID);
}
