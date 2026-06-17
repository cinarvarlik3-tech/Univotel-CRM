-- Migration 0095: Fix RLS leak — partner_operators must not see unassigned Univotel leads.
--
-- The existing staff policies all contain "OR (assigned_to IS NULL)", which was correct for
-- Univotel salespeople (they should see unassigned leads to work them). But because Postgres
-- ORs multiple policies together, partner_operators were also matching this branch and could
-- read every unassigned lead in the system — a data breach.
--
-- Fix: add "AND NOT is_partner_operator()" to every staff policy that has the IS NULL branch.
-- Partner visibility is handled exclusively by the partner_select_* policies added in 0094.

-- ─── leads ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS leads_select_assigned ON leads;
CREATE POLICY leads_select_assigned ON leads
  FOR SELECT USING (
    is_deleted = false
    AND NOT is_partner_operator()
    AND (
      is_manager_or_superadmin()
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  );

-- ─── lead_details ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS lead_details_select ON lead_details;
CREATE POLICY lead_details_select ON lead_details
  FOR SELECT USING (
    NOT is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

DROP POLICY IF EXISTS lead_details_update ON lead_details;
CREATE POLICY lead_details_update ON lead_details
  FOR UPDATE USING (
    NOT is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS lead_details_insert ON lead_details;
CREATE POLICY lead_details_insert ON lead_details
  FOR INSERT WITH CHECK (
    NOT is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
          OR l.lead_source = 'manual'
        )
    )
  );

-- ─── contact_history ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS contact_history_select ON contact_history;
CREATE POLICY contact_history_select ON contact_history
  FOR SELECT USING (
    NOT is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = contact_history.lead_uuid
        AND l.is_deleted = false
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

DROP POLICY IF EXISTS contact_history_insert ON contact_history;
CREATE POLICY contact_history_insert ON contact_history
  FOR INSERT WITH CHECK (
    NOT is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = contact_history.lead_uuid
        AND l.is_deleted = false
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
        )
    )
  );

-- ─── lead_messages ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS lead_messages_select ON lead_messages;
CREATE POLICY lead_messages_select ON lead_messages
  FOR SELECT USING (
    NOT is_partner_operator()
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_messages.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );
