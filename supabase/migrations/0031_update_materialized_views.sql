-- Migration 0031: Phase 3 — analytics materialized views with archived lead UNION.

SELECT cron.unschedule('mv_refresh');

DROP MATERIALIZED VIEW IF EXISTS mv_leads_by_source;
DROP MATERIALIZED VIEW IF EXISTS mv_agent_performance;

CREATE MATERIALIZED VIEW mv_leads_by_source AS
SELECT
  lead_source,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'archived_won') AS won_count,
  COUNT(*) FILTER (WHERE status = 'archived_lost') AS lost_count,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE status = 'archived_won')::numeric / COUNT(*)::numeric,
      4
    )
  END AS conversion_rate
FROM (
  SELECT lead_source, 'active' AS status
  FROM leads
  WHERE is_deleted = false AND is_archived = false
  UNION ALL
  SELECT lead_source, 'archived_' || archive_reason AS status
  FROM archived_leads
) combined
GROUP BY lead_source;

CREATE UNIQUE INDEX idx_mv_leads_by_source ON mv_leads_by_source (lead_source);

CREATE MATERIALIZED VIEW mv_agent_performance AS
SELECT
  s.id AS salesperson_id,
  s.full_name,
  COALESCE(active.assigned_count, 0) + COALESCE(archived.totals, 0) AS assigned_count,
  COALESCE(archived.won_count, 0) AS won_count,
  COALESCE(archived.lost_count, 0) AS lost_count,
  CASE
    WHEN COALESCE(active.assigned_count, 0) + COALESCE(archived.totals, 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(archived.won_count, 0)::numeric
      / (COALESCE(active.assigned_count, 0) + COALESCE(archived.totals, 0))::numeric,
      4
    )
  END AS conversion_rate,
  active.avg_response_minutes
FROM salespeople s
LEFT JOIN (
  SELECT
    assigned_to,
    COUNT(*) AS assigned_count,
    AVG(
      EXTRACT(EPOCH FROM (last_contact_at - created_at)) / 60
    ) FILTER (WHERE last_contact_at IS NOT NULL) AS avg_response_minutes
  FROM leads
  WHERE is_deleted = false AND is_archived = false
  GROUP BY assigned_to
) active ON active.assigned_to = s.id
LEFT JOIN (
  SELECT
    assigned_to,
    COUNT(*) AS totals,
    COUNT(*) FILTER (WHERE archive_reason = 'won') AS won_count,
    COUNT(*) FILTER (WHERE archive_reason = 'lost') AS lost_count
  FROM archived_leads
  GROUP BY assigned_to
) archived ON archived.assigned_to = s.id;

CREATE UNIQUE INDEX idx_mv_agent_performance ON mv_agent_performance (salesperson_id);

DROP MATERIALIZED VIEW IF EXISTS mv_funnel_distribution;
CREATE MATERIALIZED VIEW mv_funnel_distribution AS
SELECT funnel_status, COUNT(*) AS lead_count
FROM leads
WHERE is_deleted = false AND is_archived = false
GROUP BY funnel_status;

CREATE UNIQUE INDEX idx_mv_funnel_distribution ON mv_funnel_distribution (funnel_status);

DROP MATERIALIZED VIEW IF EXISTS mv_sla_breach_rate;
CREATE MATERIALIZED VIEW mv_sla_breach_rate AS
SELECT
  lead_source,
  COUNT(*) FILTER (WHERE sla_status = 'breached') AS breach_count,
  COUNT(*) AS total_count,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE sla_status = 'breached')::numeric / COUNT(*)::numeric,
      4
    )
  END AS breach_rate
FROM leads
WHERE is_deleted = false AND is_archived = false
GROUP BY lead_source;

CREATE UNIQUE INDEX idx_mv_sla_breach_rate ON mv_sla_breach_rate (lead_source);

REFRESH MATERIALIZED VIEW mv_leads_by_source;
REFRESH MATERIALIZED VIEW mv_funnel_distribution;
REFRESH MATERIALIZED VIEW mv_agent_performance;
REFRESH MATERIALIZED VIEW mv_sla_breach_rate;

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
