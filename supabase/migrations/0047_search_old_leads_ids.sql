-- Migration 0047: Trigram fuzzy search RPC for old_leads list.

CREATE OR REPLACE FUNCTION search_old_leads_ids(search_term text)
RETURNS TABLE (lead_uuid uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT ol.uuid
  FROM old_leads ol
  WHERE (
    similarity(COALESCE(ol.lead_name, ''), search_term) > 0.3
    OR similarity(ol.lead_phone, search_term) > 0.3
  )
  AND is_manager_or_superadmin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION search_old_leads_ids IS 'Trigram search over old lead name and contact; manager/superadmin only.';

GRANT EXECUTE ON FUNCTION search_old_leads_ids(text) TO authenticated;
