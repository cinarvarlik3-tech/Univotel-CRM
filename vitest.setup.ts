/**
 * Vitest setup — provides required env vars for unit tests.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.CHATWOOT_WEBHOOK_SECRET = 'test-chatwoot-secret';
process.env.CHATWOOT_BASE_URL = 'https://marketinguni.app';
process.env.CHATWOOT_API_TOKEN = 'test-chatwoot-api-token';
process.env.CHATWOOT_ACCOUNT_ID = '1';
process.env.CHATWOOT_SYNC_ENABLED = 'true';
process.env.CHATWOOT_ASSIGNEE_SYNC_ENABLED = 'true';
process.env.CHATWOOT_LABEL_SYNC_ENABLED = 'true';
process.env.WHATSAPP_WEBHOOK_SECRET = 'test-whatsapp-secret';
process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
process.env.WHATSAPP_API_TOKEN = 'test-whatsapp-api-token';
process.env.NETGSM_STATIC_TOKEN = 'test-netgsm-token';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.TELEGRAM_MANAGER_CHAT_IDS = '123456';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.CRON_SECRET = 'test-cron-secret-minimum-32-characters';
process.env.MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/test-webhook';
