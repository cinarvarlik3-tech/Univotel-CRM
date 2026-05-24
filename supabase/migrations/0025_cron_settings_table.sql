-- Migration 0025: Replace ALTER DATABASE cron config with cron_settings table.
-- Hosted Supabase denies ALTER DATABASE ... SET for custom parameters (42501).

CREATE TABLE IF NOT EXISTS cron_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE cron_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE cron_settings IS 'pg_cron HTTP job config — populate base_url and cron_secret via SQL editor (not in git).';

REVOKE ALL ON cron_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION get_cron_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM cron_settings WHERE key = p_key;
$$;

REVOKE ALL ON FUNCTION get_cron_setting(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cron_setting(TEXT) TO postgres;

-- Reschedule jobs to read from cron_settings instead of current_setting()

SELECT cron.unschedule('sla-alerts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sla-alerts'
);
SELECT cron.schedule(
  'sla-alerts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := get_cron_setting('base_url') || '/api/cron/sla-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule('task-overdue') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'task-overdue'
);
SELECT cron.schedule(
  'task-overdue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := get_cron_setting('base_url') || '/api/cron/task-overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule('campaign-resume') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'campaign-resume'
);
SELECT cron.schedule(
  'campaign-resume',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := get_cron_setting('base_url') || '/api/cron/campaign-resume',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
