-- Schedule the visit-reminder cron using get_cron_setting (NOT app.base_url).
-- Runs at 06:00 UTC (09:00 Istanbul) — fires the day before the visit.

SELECT cron.schedule(
  'visit-reminder',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url     := get_cron_setting('base_url') || '/api/cron/visit-reminder',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);
