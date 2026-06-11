-- Migration 0069: pg_cron job for the 24h restriction.
--
-- Every 15 minutes, POSTs /api/cron/restriction-24h which sets is_24h_restricted
-- = true for active leads whose last incoming Chatwoot message is older than 24h
-- (leads.last_inbound_message_at, maintained by the webhook). The endpoint does
-- the bulk UPDATE; this job only triggers it. Worst-case lateness on the 24h
-- boundary is ~15 minutes, which is acceptable.
--
-- Uses get_cron_setting() (cron_settings table) for base_url and cron_secret,
-- consistent with the other HTTP-callback crons (see migration 0025).

SELECT cron.unschedule('restriction-24h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'restriction-24h'
);

SELECT cron.schedule(
  'restriction-24h',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := get_cron_setting('base_url') || '/api/cron/restriction-24h',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
