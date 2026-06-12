/**
 * Integration test setup — loads real Supabase credentials from .env.local
 * and disables all Chatwoot side-effects so tests don't hit the live chat platform.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load real credentials before any lib module is imported.
config({ path: resolve(__dirname, '.env.local') });

// Disable all Chatwoot outbound syncs — test leads have no Chatwoot conversation.
process.env.CHATWOOT_SYNC_ENABLED = 'false';
process.env.CHATWOOT_ASSIGNEE_SYNC_ENABLED = 'false';
process.env.CHATWOOT_LABEL_SYNC_ENABLED = 'false';

// Provide stubs for other required env vars not in .env.local.
process.env.CHATWOOT_WEBHOOK_SECRET = process.env.CHATWOOT_WEBHOOK_SECRET ?? 'stub';
process.env.WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET ?? 'stub';
process.env.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? 'stub';
process.env.WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN ?? 'stub';
process.env.NETGSM_STATIC_TOKEN = process.env.NETGSM_STATIC_TOKEN ?? 'stub';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? 'stub';
process.env.TELEGRAM_MANAGER_CHAT_IDS = process.env.TELEGRAM_MANAGER_CHAT_IDS ?? '0';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
process.env.CRON_SECRET = process.env.CRON_SECRET ?? 'stub-cron-secret-minimum-32-characters!!';
process.env.MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL ?? 'https://hook.example.com/stub';
