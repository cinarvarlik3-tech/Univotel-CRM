-- Migration 0024: pg_cron notification/campaign jobs via pg_net HTTP to CRM API endpoints.
-- Requires app.base_url and app.cron_secret database settings (see README — not stored here).

CREATE EXTENSION IF NOT EXISTS pg_net;

-- SLA alerts — every 5 minutes
SELECT cron.unschedule('sla-alerts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sla-alerts'
);
SELECT cron.schedule(
  'sla-alerts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url') || '/api/cron/sla-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Task overdue — every 5 minutes
SELECT cron.unschedule('task-overdue') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'task-overdue'
);
SELECT cron.schedule(
  'task-overdue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url') || '/api/cron/task-overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Campaign resume — every 5 minutes
SELECT cron.unschedule('campaign-resume') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'campaign-resume'
);
SELECT cron.schedule(
  'campaign-resume',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url') || '/api/cron/campaign-resume',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMENT ON EXTENSION pg_net IS 'Async HTTP from Postgres — used by pg_cron to call CRM cron API routes.';
