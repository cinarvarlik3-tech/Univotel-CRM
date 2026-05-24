-- Migration 0033: Phase 4 — superadmin role and RLS helper functions.

ALTER TABLE salespeople DROP CONSTRAINT IF EXISTS salespeople_role_check;
ALTER TABLE salespeople ADD CONSTRAINT salespeople_role_check
  CHECK (role IN ('salesperson', 'manager', 'superadmin'));

CREATE OR REPLACE FUNCTION is_manager_or_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM salespeople
    WHERE id = auth.uid()
      AND role IN ('manager', 'superadmin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM salespeople
    WHERE id = auth.uid()
      AND role = 'superadmin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- salespeople
DROP POLICY IF EXISTS salespeople_select_own ON salespeople;
CREATE POLICY salespeople_select_own ON salespeople
  FOR SELECT USING (id = auth.uid() OR is_manager_or_superadmin());

DROP POLICY IF EXISTS salespeople_manager_all ON salespeople;
CREATE POLICY salespeople_manager_all ON salespeople
  FOR ALL USING (is_manager_or_superadmin());

-- properties
DROP POLICY IF EXISTS properties_manager_all ON properties;
CREATE POLICY properties_manager_all ON properties
  FOR ALL USING (is_manager_or_superadmin());

-- leads
DROP POLICY IF EXISTS leads_select_assigned ON leads;
CREATE POLICY leads_select_assigned ON leads
  FOR SELECT USING (
    is_deleted = false
    AND (
      is_manager_or_superadmin()
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  );

DROP POLICY IF EXISTS leads_update_assigned ON leads;
CREATE POLICY leads_update_assigned ON leads
  FOR UPDATE USING (
    is_deleted = false
    AND (
      is_manager_or_superadmin()
      OR assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS leads_manager_delete ON leads;
CREATE POLICY leads_manager_delete ON leads
  FOR UPDATE USING (is_manager_or_superadmin());

-- lead_details
DROP POLICY IF EXISTS lead_details_select ON lead_details;
CREATE POLICY lead_details_select ON lead_details
  FOR SELECT USING (
    EXISTS (
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

DROP POLICY IF EXISTS lead_details_select_archived ON lead_details;
CREATE POLICY lead_details_select_archived ON lead_details
  FOR SELECT USING (
    is_manager_or_superadmin()
    OR EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_archived = true
        AND l.assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS lead_details_update ON lead_details;
CREATE POLICY lead_details_update ON lead_details
  FOR UPDATE USING (
    EXISTS (
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
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
          OR l.lead_source = 'manual'
        )
    )
  );

-- contact_history
DROP POLICY IF EXISTS contact_history_select ON contact_history;
CREATE POLICY contact_history_select ON contact_history
  FOR SELECT USING (
    EXISTS (
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
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = contact_history.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

-- tasks
DROP POLICY IF EXISTS tasks_select ON tasks;
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (is_manager_or_superadmin() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (is_manager_or_superadmin() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS tasks_insert ON tasks;
CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (is_manager_or_superadmin() OR assigned_to = auth.uid());

-- notifications
DROP POLICY IF EXISTS notifications_manager_select ON notifications;
CREATE POLICY notifications_manager_select ON notifications
  FOR SELECT USING (is_manager_or_superadmin());

DROP POLICY IF EXISTS notifications_manager_resolve ON notifications;
CREATE POLICY notifications_manager_resolve ON notifications
  FOR UPDATE USING (is_manager_or_superadmin())
  WITH CHECK (is_manager_or_superadmin());

-- archived leads
DROP POLICY IF EXISTS archived_leads_manager_select ON archived_leads;
CREATE POLICY archived_leads_manager_select ON archived_leads
  FOR SELECT USING (is_manager_or_superadmin());

DROP POLICY IF EXISTS archived_contact_history_manager_select ON archived_contact_history;
CREATE POLICY archived_contact_history_manager_select ON archived_contact_history
  FOR SELECT USING (is_manager_or_superadmin());

-- lead_details_safe view — superadmin sees masked fields like manager
DROP VIEW IF EXISTS lead_details_safe;
CREATE VIEW lead_details_safe
WITH (security_invoker = true)
AS
SELECT
  ld.lead_uuid,
  ld.university,
  ld.interested_hotel,
  ld.rec_hotel,
  ld.room_type,
  ld.budget_min,
  ld.budget_max,
  ld.move_in,
  ld.dorm_awaiting,
  ld.uni_year,
  ld.parent_name,
  ld.kvkk_opt_in,
  ld.marketing_opt_in,
  CASE
    WHEN is_manager_or_superadmin() THEN ld.student_gender
    WHEN EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = ld.lead_uuid
        AND l.assigned_to = auth.uid()
        AND l.is_archived = false
    ) THEN ld.student_gender
    ELSE NULL
  END AS student_gender,
  CASE
    WHEN is_manager_or_superadmin() THEN ld.nationality
    WHEN EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = ld.lead_uuid
        AND l.assigned_to = auth.uid()
        AND l.is_archived = false
    ) THEN ld.nationality
    ELSE NULL
  END AS nationality,
  ld.preferred_district,
  ld.created_at,
  ld.updated_at
FROM lead_details ld;

GRANT SELECT ON lead_details_safe TO authenticated;

-- search_leads_ids — include superadmin
CREATE OR REPLACE FUNCTION search_leads_ids(search_term text)
RETURNS TABLE (lead_uuid uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT l.uuid
  FROM leads l
  WHERE l.is_deleted = false
    AND l.is_archived = false
    AND (
      similarity(COALESCE(l.lead_name, ''), search_term) > 0.3
      OR similarity(l.lead_phone, search_term) > 0.3
    )
    AND (
      is_manager_or_superadmin()
      OR l.assigned_to = auth.uid()
      OR l.assigned_to IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
