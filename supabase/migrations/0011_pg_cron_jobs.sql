-- Migration 0011: pg_cron scheduled jobs for SLA, tasks, views, and reconciliation.

-- SLA status update every 5 minutes
SELECT cron.schedule(
  'sla_update',
  '*/5 * * * *',
  $$
  UPDATE leads SET sla_status =
    CASE
      WHEN last_contact_at IS NOT NULL THEN 'on_time'
      WHEN sla_deadline < NOW() THEN 'breached'
      WHEN sla_deadline < NOW() + INTERVAL '5 minutes' THEN 'at_risk'
      ELSE 'on_time'
    END
  WHERE is_deleted = false
    AND funnel_status NOT IN ('won', 'lost', 'nurture');
  $$
);

-- Task overdue flag every 5 minutes
SELECT cron.schedule(
  'task_overdue_check',
  '*/5 * * * *',
  $$
  UPDATE tasks
  SET is_late = true
  WHERE is_completed = false
    AND due_when < NOW()
    AND is_late = false;
  $$
);

-- Materialized view refresh every 5 minutes
SELECT cron.schedule(
  'mv_refresh',
  '*/5 * * * *',
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leads_by_source;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sla_breach_rate;
  $$
);

-- Nightly active_lead_count reconciliation at 03:00
SELECT cron.schedule(
  'active_lead_count_reconcile',
  '0 3 * * *',
  $$
  UPDATE salespeople s
  SET active_lead_count = sub.cnt
  FROM (
    SELECT assigned_to AS id, COUNT(*) AS cnt
    FROM leads
    WHERE is_deleted = false
      AND assigned_to IS NOT NULL
      AND funnel_status NOT IN ('won', 'lost', 'nurture')
    GROUP BY assigned_to
  ) sub
  WHERE s.id = sub.id;

  UPDATE salespeople s
  SET active_lead_count = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE l.assigned_to = s.id
      AND l.is_deleted = false
      AND l.funnel_status NOT IN ('won', 'lost', 'nurture')
  );
  $$
);
