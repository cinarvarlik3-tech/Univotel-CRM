-- Migration 0050: Remove 'at_risk' SLA status — collapse to 'on_time'.
-- Backfill, tighten CHECK constraints, and update the pg_cron job.

-- 1. Backfill: at_risk leads are not yet breached, so they become on_time.
UPDATE leads    SET sla_status = 'on_time' WHERE sla_status = 'at_risk';
UPDATE old_leads SET sla_status = 'on_time' WHERE sla_status = 'at_risk';

-- 2. Replace CHECK constraint on leads.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_sla_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_sla_status_check
  CHECK (sla_status IN ('on_time', 'breached'));

-- 3. Replace CHECK constraint on old_leads.
ALTER TABLE old_leads DROP CONSTRAINT IF EXISTS old_leads_sla_status_check;
ALTER TABLE old_leads ADD CONSTRAINT old_leads_sla_status_check
  CHECK (sla_status IN ('on_time', 'breached'));

-- 4. Replace the pg_cron job — remove the at_risk branch.
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
