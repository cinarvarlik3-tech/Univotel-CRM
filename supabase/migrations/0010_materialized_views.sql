-- Migration 0010: Materialized views for dashboard analytics.

CREATE MATERIALIZED VIEW mv_leads_by_source AS
SELECT
  lead_source,
  COUNT(*) AS lead_count,
  COUNT(*) FILTER (WHERE funnel_status = 'won') AS won_count,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE funnel_status = 'won')::numeric / COUNT(*)::numeric,
      4
    )
  END AS conversion_rate
FROM leads
WHERE is_deleted = false
GROUP BY lead_source;

CREATE UNIQUE INDEX idx_mv_leads_by_source ON mv_leads_by_source (lead_source);

CREATE MATERIALIZED VIEW mv_funnel_distribution AS
SELECT funnel_status, COUNT(*) AS lead_count
FROM leads
WHERE is_deleted = false
GROUP BY funnel_status;

CREATE UNIQUE INDEX idx_mv_funnel_distribution ON mv_funnel_distribution (funnel_status);

CREATE MATERIALIZED VIEW mv_agent_performance AS
SELECT
  s.id AS salesperson_id,
  s.full_name,
  COUNT(l.uuid) AS assigned_count,
  COUNT(l.uuid) FILTER (WHERE l.funnel_status = 'won') AS won_count,
  AVG(
    EXTRACT(EPOCH FROM (l.last_contact_at - l.created_at)) / 60
  ) FILTER (WHERE l.last_contact_at IS NOT NULL) AS avg_response_minutes
FROM salespeople s
LEFT JOIN leads l ON l.assigned_to = s.id AND l.is_deleted = false
GROUP BY s.id, s.full_name;

CREATE UNIQUE INDEX idx_mv_agent_performance ON mv_agent_performance (salesperson_id);

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
WHERE is_deleted = false
GROUP BY lead_source;

CREATE UNIQUE INDEX idx_mv_sla_breach_rate ON mv_sla_breach_rate (lead_source);
