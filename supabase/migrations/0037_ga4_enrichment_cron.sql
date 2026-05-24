-- Migration 0037: Phase 4 — pg_cron job for GA4 enrichment retries (attempts 2–4).

SELECT cron.unschedule('ga4-enrichment') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ga4-enrichment'
);

SELECT cron.schedule(
  'ga4-enrichment',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url') || '/api/cron/ga4-enrichment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
