-- Migration 0020: Fix materialized views and reconcile cron for Turkish funnel slugs.

SELECT cron.unschedule('mv_refresh');

DROP MATERIALIZED VIEW IF EXISTS mv_leads_by_source;
DROP MATERIALIZED VIEW IF EXISTS mv_agent_performance;

CREATE MATERIALIZED VIEW mv_leads_by_source AS
SELECT
  lead_source,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (WHERE funnel_status = 'sozlesme-imzalandi') AS won_count,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE funnel_status = 'sozlesme-imzalandi')::numeric / COUNT(*)::numeric,
      4
    )
  END AS conversion_rate
FROM leads
WHERE is_deleted = false
GROUP BY lead_source;

CREATE UNIQUE INDEX idx_mv_leads_by_source ON mv_leads_by_source (lead_source);

CREATE MATERIALIZED VIEW mv_agent_performance AS
SELECT
  s.id AS salesperson_id,
  s.full_name,
  COUNT(l.uuid) AS assigned_count,
  COUNT(l.uuid) FILTER (WHERE l.funnel_status = 'sozlesme-imzalandi') AS won_count,
  AVG(
    EXTRACT(EPOCH FROM (l.last_contact_at - l.created_at)) / 60
  ) FILTER (WHERE l.last_contact_at IS NOT NULL) AS avg_response_minutes
FROM salespeople s
LEFT JOIN leads l ON l.assigned_to = s.id AND l.is_deleted = false
GROUP BY s.id, s.full_name;

CREATE UNIQUE INDEX idx_mv_agent_performance ON mv_agent_performance (salesperson_id);

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leads_by_source;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_distribution;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sla_breach_rate;

SELECT cron.unschedule('active_lead_count_reconcile');
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
      AND l.funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor')
  );
  $$
);

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
