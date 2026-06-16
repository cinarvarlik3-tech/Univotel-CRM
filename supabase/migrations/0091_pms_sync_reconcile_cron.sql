-- Migration 0091: nightly PMS sync reconciliation cron (A-sync backstop).
-- Full-scans univotel hotels/room_types into CRM via POST /api/cron/pms-sync-reconcile.
-- Requires UNIVOTEL_SUPABASE_URL + UNIVOTEL_SUPABASE_SERVICE_ROLE_KEY on the app host.

SELECT cron.unschedule('pms-sync-reconcile') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pms-sync-reconcile'
);

SELECT cron.schedule(
  'pms-sync-reconcile',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := get_cron_setting('base_url') || '/api/cron/pms-sync-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_cron_setting('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
