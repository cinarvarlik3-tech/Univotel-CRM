-- Migration 0056: Add deal_awaiting flag to leads.
-- Leads tagged with 'deal_awaiting' in Chatwoot are parked here until the
-- underlying property deal goes through. They are NOT lost — no loss reason.
-- They are excluded from the main leads list, pipeline, SLA updates, and
-- active lead counts, but remain visible in My Leads with a warning badge.

-- 1. Add the column.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_awaiting BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Partial index — most leads are false, so only index the true set.
CREATE INDEX IF NOT EXISTS leads_deal_awaiting_idx ON leads(deal_awaiting) WHERE deal_awaiting = true;

-- 3. Reschedule SLA cron to skip deal_awaiting leads (matches 0054 + deal_awaiting).
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
        AND deal_awaiting = false
        AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor', 'lost');
    END IF;
  END
  $body$;
  $$
);

-- 4. Reschedule active-lead-count reconcile to exclude deal_awaiting leads (matches 0054 + deal_awaiting).
SELECT cron.unschedule('active_lead_count_reconcile');
SELECT cron.schedule(
  'active_lead_count_reconcile',
  '15 3 * * *',
  $$
  UPDATE salespeople s
  SET active_lead_count = sub.cnt
  FROM (
    SELECT assigned_to AS id, COUNT(*) AS cnt
    FROM leads
    WHERE is_deleted = false
      AND is_archived = false
      AND assigned_to IS NOT NULL
      AND deal_awaiting = false
      AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor', 'lost')
    GROUP BY assigned_to
  ) sub
  WHERE s.id = sub.id;

  UPDATE salespeople s
  SET active_lead_count = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE l.assigned_to = s.id
      AND l.is_deleted = false
      AND l.is_archived = false
      AND l.deal_awaiting = false
      AND l.funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor', 'lost')
  );
  $$
);
