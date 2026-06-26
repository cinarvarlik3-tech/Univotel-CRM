-- Migration 0105: Reschedule sla-alerts at once-per-hour.
--
-- 0102 unscheduled the old every-5-min sla-alerts job.
-- This reschedules it hourly. The job runner guards business hours internally
-- so it no-ops outside 09:00–17:00 Istanbul.

SELECT cron.unschedule('sla-alerts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sla-alerts'
);

SELECT cron.schedule(
  'sla-alerts',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := get_cron_setting('base_url') || '/api/cron/sla-alerts',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);
