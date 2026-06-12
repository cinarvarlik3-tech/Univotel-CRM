-- Migration 0080: Add is_inactive flag to search_leads_global for search UI badges.
-- Inactive = hidden from default list views (lost/finalized, moved-in, 24h-restricted).
-- Must DROP first: Postgres cannot change RETURNS TABLE shape via CREATE OR REPLACE.

DROP FUNCTION IF EXISTS search_leads_global(TEXT, INT);

CREATE FUNCTION search_leads_global(
  q TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  uuid            UUID,
  lead_name       TEXT,
  display_name    TEXT,
  lead_phone      TEXT,
  funnel_status   TEXT,
  assigned_to     UUID,
  assignee_name   TEXT,
  last_contact_at TIMESTAMPTZ,
  message_from    TEXT,
  is_inactive     BOOLEAN
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
    l.message_from,
    (
      l.funnel_status IN ('lost', 'sozlesme-imzalandi')
      OR l.has_moved_in = true
      OR l.is_24h_restricted = true
    ) AS is_inactive
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
    CASE WHEN l.lead_phone = q THEN 0 ELSE 1 END,
    l.last_contact_at DESC NULLS LAST
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_leads_global(TEXT, INT) TO authenticated;
