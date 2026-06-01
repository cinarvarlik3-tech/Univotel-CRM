-- Migration 0048: SLA status updates only during Istanbul business hours (09:00–17:00).

SELECT cron.unschedule('sla_update');
SELECT cron.schedule(
  'sla_update',
  '*/5 * * * *',
  $$
  DO $body$
  BEGIN
    IF (NOW() AT TIME ZONE 'Europe/Istanbul')::time >= TIME '09:00'
       AND (NOW() AT TIME ZONE 'Europe/Istanbul')::time < TIME '17:00' THEN
      UPDATE leads SET sla_status =
        CASE
          WHEN last_contact_at IS NOT NULL THEN 'on_time'
          WHEN sla_deadline < NOW() THEN 'breached'
          WHEN sla_deadline < NOW() + INTERVAL '5 minutes' THEN 'at_risk'
          ELSE 'on_time'
        END
      WHERE is_deleted = false
        AND is_archived = false
        AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor');
    END IF;
  END
  $body$;
  $$
);
