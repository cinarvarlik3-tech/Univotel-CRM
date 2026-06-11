-- Migration 0057: Add '24h_window_warning' terminal funnel status.
-- Chatwoot label 24h_window_warning maps to this stage (between ilgilenmiyor and lost).
-- Excluded from SLA updates and active lead counts like other terminal stages.
-- Not added to auto-archive — operational warning state, not a closed outcome.

-- 1. Allow the new funnel status (+ 'lost', which 0054 added without updating the CHECK).
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_funnel_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_funnel_status_check CHECK (
  funnel_status IN (
    'yeni', 'aranacak', 'arandi', 'arandi-acmadi', 'bizi-aradi-konustuk',
    'ziyaret', 'ziyaret-etmedi', 'ziyaret-etti', 'teklif-gonderildi',
    'kapora-alindi', 'sozlesme-imzalandi', 'ziyaret-ama-almayacak',
    'ilgilenmiyor', '24h_window_warning', 'lost'
  )
);

-- 2. Reschedule SLA cron to skip 24h_window_warning leads (matches 0056 + new status).
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
        AND funnel_status NOT IN (
          'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor',
          '24h_window_warning', 'lost'
        );
    END IF;
  END
  $body$;
  $$
);

-- 3. Reschedule active-lead-count reconcile to exclude 24h_window_warning leads.
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
      AND funnel_status NOT IN (
        'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor',
        '24h_window_warning', 'lost'
      )
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
      AND l.funnel_status NOT IN (
        'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor',
        '24h_window_warning', 'lost'
      )
  );
  $$
);
