-- Migration 0014: Phase 1c — RLS alignment for unassigned leads + trigram search RPC.

-- ---------------------------------------------------------------------------
-- RLS: allow salesperson to update lead_details on unassigned leads they can view
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS lead_details_update ON lead_details;

CREATE POLICY lead_details_update ON lead_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_deleted = false
        AND (
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: allow salesperson to insert contact_history on unassigned leads they can view
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS contact_history_insert ON contact_history;

CREATE POLICY contact_history_insert ON contact_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = contact_history.lead_uuid
        AND l.is_deleted = false
        AND (
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Trigram search RPC — returns lead UUIDs visible to the invoking user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_leads_ids(search_term text)
RETURNS TABLE (lead_uuid uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT l.uuid
  FROM leads l
  WHERE l.is_deleted = false
    AND (
      similarity(COALESCE(l.lead_name, ''), search_term) > 0.3
      OR similarity(l.lead_phone, search_term) > 0.3
    )
    AND (
      get_user_role() = 'manager'
      OR l.assigned_to = auth.uid()
      OR l.assigned_to IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION search_leads_ids IS 'Trigram search over lead_name and lead_phone; respects lead visibility.';

GRANT EXECUTE ON FUNCTION search_leads_ids(text) TO authenticated;
