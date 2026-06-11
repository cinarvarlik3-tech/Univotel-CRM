-- Migration 0053: Per-salesperson Telegram notifications for inbound lead messages.
-- Adds a notification-state column to lead_messages (the work queue), extends the
-- notifications alert_type whitelist, seeds tunable config, and schedules a 1-minute
-- pg_cron job that drains unnotified inbound messages off the webhook hot path.

-- 1. Notification state on lead_messages. NULL = not yet processed by the notify cron.
ALTER TABLE lead_messages
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

COMMENT ON COLUMN lead_messages.notified_at IS
  'Set by the lead-message-notify cron once this inbound message has been processed (sent, suppressed, or dropped). NULL = pending.';

-- Drives the cron scan: only pending inbound messages.
CREATE INDEX IF NOT EXISTS idx_lead_messages_notify_pending
  ON lead_messages (created_at)
  WHERE notified_at IS NULL AND message_type = 'incoming';

-- 2. Allow the new alert_type on the notifications audit table.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_alert_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_alert_type_check CHECK (
  alert_type IN (
    'sla_breach',
    'task_overdue',
    'unassigned_lead',
    'webhook_failure',
    'campaign_paused',
    'campaign_failed',
    'lead_message'
  )
);

-- 3. Tunable runtime config (adjustable in peak season without a redeploy).
INSERT INTO cron_settings (key, value) VALUES
  ('lead_notify_enabled', 'true'),
  ('chatwoot_active_window_minutes', '5'),
  ('lead_message_cooldown_minutes', '10')
ON CONFLICT (key) DO NOTHING;

-- 4. Schedule the drain cron every minute (mirrors the pattern in migration 0025).
SELECT cron.unschedule('lead-message-notify') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'lead-message-notify'
);
SELECT cron.schedule(
  'lead-message-notify',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := get_cron_setting('base_url') || '/api/cron/lead-message-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
