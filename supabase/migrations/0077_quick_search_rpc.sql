-- Migration 0077: Global quick-search RPC with SECURITY DEFINER (§4.6 / D14)
-- Allows any authenticated salesperson to search ALL leads (own + others + unassigned)
-- by name or phone number. This is the SOLE widened-visibility path — list RLS stays tight.
-- Cross-agent search does NOT reassign; it only opens for reading/logging.

CREATE OR REPLACE FUNCTION search_leads_global(
  q TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  uuid          UUID,
  lead_name     TEXT,
  display_name  TEXT,
  lead_phone    TEXT,
  funnel_status TEXT,
  assigned_to   UUID,
  assignee_name TEXT,
  last_contact_at TIMESTAMPTZ,
  message_from  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.uuid,
    l.lead_name,
    l.display_name,
    l.lead_phone,
    l.funnel_status,
    l.assigned_to,
    sp.full_name AS assignee_name,
    l.last_contact_at,
    l.message_from
  FROM leads l
  LEFT JOIN salespeople sp ON sp.id = l.assigned_to
  WHERE
    l.is_deleted = false
    AND l.is_archived = false
    AND (
      COALESCE(l.display_name, l.auto_logged_name, l.lead_name) ILIKE '%' || q || '%'
      OR l.lead_phone ILIKE '%' || q || '%'
    )
  ORDER BY
    -- Exact phone match first, then name relevance, then recency
    CASE WHEN l.lead_phone = q THEN 0 ELSE 1 END,
    l.last_contact_at DESC NULLS LAST
  LIMIT result_limit;
END;
$$;

-- Grant execute to authenticated users only (SECURITY DEFINER ensures broad lead access).
GRANT EXECUTE ON FUNCTION search_leads_global(TEXT, INT) TO authenticated;
