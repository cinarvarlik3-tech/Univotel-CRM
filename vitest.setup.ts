/**
 * Vitest setup — provides required env vars for unit tests.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.CHATWOOT_WEBHOOK_SECRET = 'test-chatwoot-secret';
process.env.WHATSAPP_WEBHOOK_SECRET = 'test-whatsapp-secret';
process.env.NETGSM_STATIC_TOKEN = 'test-netgsm-token';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.TELEGRAM_MANAGER_CHAT_IDS = '123456';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.CRON_SECRET = 'test-cron-secret-minimum-32-characters';
