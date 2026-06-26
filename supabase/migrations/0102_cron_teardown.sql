-- Migration 0102: Cron teardown + reschedule.
--
-- Removes obsolete jobs (campaigns, task-overdue, sla-alerts),
-- fixes ga4-enrichment (current_setting → get_cron_setting),
-- corrects visit-reminder to 06:30 UTC, and adds three new daily jobs.

-- ── Unschedule obsolete jobs ─────────────────────────────────────────────────

SELECT cron.unschedule('campaign-resume') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'campaign-resume'
);

SELECT cron.unschedule('campaign_daily_reset') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'campaign_daily_reset'
);

SELECT cron.unschedule('task_overdue_check') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'task_overdue_check'
);

SELECT cron.unschedule('task-overdue') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'task-overdue'
);

SELECT cron.unschedule('sla-alerts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sla-alerts'
);

-- ── Fix ga4-enrichment (was using current_setting) ───────────────────────────

SELECT cron.unschedule('ga4-enrichment') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ga4-enrichment'
);

SELECT cron.schedule(
  'ga4-enrichment',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := get_cron_setting('base_url') || '/api/cron/ga4-enrichment',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── Fix visit-reminder: 06:00 → 06:30 UTC (09:30 Istanbul) ──────────────────

SELECT cron.unschedule('visit-reminder') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'visit-reminder'
);

SELECT cron.schedule(
  'visit-reminder',
  '30 6 * * *',
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

-- ── New: visit-resolution-ping at 14:30 UTC (17:30 Istanbul) ─────────────────

SELECT cron.unschedule('visit-resolution-ping') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'visit-resolution-ping'
);

SELECT cron.schedule(
  'visit-resolution-ping',
  '30 14 * * *',
  $$
  SELECT net.http_post(
    url     := get_cron_setting('base_url') || '/api/cron/visit-resolution-ping',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── New: move-in-reminder at 06:30 UTC (09:30 Istanbul) ──────────────────────

SELECT cron.unschedule('move-in-reminder') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'move-in-reminder'
);

SELECT cron.schedule(
  'move-in-reminder',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url     := get_cron_setting('base_url') || '/api/cron/move-in-reminder',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── New: nurture-task-alerts at 06:30 UTC (09:30 Istanbul) ───────────────────

SELECT cron.unschedule('nurture-task-alerts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'nurture-task-alerts'
);

SELECT cron.schedule(
  'nurture-task-alerts',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url     := get_cron_setting('base_url') || '/api/cron/nurture-task-alerts',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);
