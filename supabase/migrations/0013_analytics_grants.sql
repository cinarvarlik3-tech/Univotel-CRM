-- Migration 0013: Grant SELECT on analytics materialized views to authenticated users.
-- Access control for sensitive aggregates is enforced in GET /api/analytics (manager-only).

GRANT SELECT ON mv_leads_by_source TO authenticated;
GRANT SELECT ON mv_funnel_distribution TO authenticated;
GRANT SELECT ON mv_agent_performance TO authenticated;
GRANT SELECT ON mv_sla_breach_rate TO authenticated;
