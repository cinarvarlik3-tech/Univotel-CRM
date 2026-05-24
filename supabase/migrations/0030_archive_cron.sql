-- Migration 0030: Phase 3 — nightly archive cron and staggered reconcile.

SELECT cron.schedule(
  'nightly-archive',
  '0 3 * * *',
  $$ CALL archive_terminal_leads(); $$
);

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
      AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor')
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
      AND l.funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor')
  );
  $$
);
