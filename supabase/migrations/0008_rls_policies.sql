-- Migration 0008: Row Level Security policies for multi-role access.

ALTER TABLE salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM salespeople WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- salespeople policies
CREATE POLICY salespeople_select_own ON salespeople
  FOR SELECT USING (id = auth.uid() OR get_user_role() = 'manager');

CREATE POLICY salespeople_manager_all ON salespeople
  FOR ALL USING (get_user_role() = 'manager');

-- properties policies
CREATE POLICY properties_select_authenticated ON properties
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY properties_manager_all ON properties
  FOR ALL USING (get_user_role() = 'manager');

-- leads policies
CREATE POLICY leads_select_assigned ON leads
  FOR SELECT USING (
    is_deleted = false
    AND (
      get_user_role() = 'manager'
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  );

CREATE POLICY leads_insert_manual ON leads
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND lead_source = 'manual'
  );

CREATE POLICY leads_update_assigned ON leads
  FOR UPDATE USING (
    is_deleted = false
    AND (
      get_user_role() = 'manager'
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY leads_manager_delete ON leads
  FOR UPDATE USING (get_user_role() = 'manager');

-- lead_details policies
CREATE POLICY lead_details_select ON lead_details
  FOR SELECT USING (
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

CREATE POLICY lead_details_update ON lead_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_deleted = false
        AND (
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
        )
    )
  );

CREATE POLICY lead_details_insert ON lead_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND (
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
          OR l.lead_source = 'manual'
        )
    )
  );

-- KVKK-safe view masking sensitive fields for non-managers on unassigned others' leads
CREATE VIEW lead_details_safe AS
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
    WHEN get_user_role() = 'manager' THEN ld.student_gender
    WHEN EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = ld.lead_uuid AND l.assigned_to = auth.uid()
    ) THEN ld.student_gender
    ELSE NULL
  END AS student_gender,
  CASE
    WHEN get_user_role() = 'manager' THEN ld.nationality
    WHEN EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = ld.lead_uuid AND l.assigned_to = auth.uid()
    ) THEN ld.nationality
    ELSE NULL
  END AS nationality,
  ld.preferred_district,
  ld.created_at,
  ld.updated_at
FROM lead_details ld;

-- contact_history policies
CREATE POLICY contact_history_select ON contact_history
  FOR SELECT USING (
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

CREATE POLICY contact_history_insert ON contact_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = contact_history.lead_uuid
        AND l.is_deleted = false
        AND (
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
        )
    )
  );

-- tasks policies
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (
    get_user_role() = 'manager' OR assigned_to = auth.uid()
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    get_user_role() = 'manager' OR assigned_to = auth.uid()
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    get_user_role() = 'manager' OR assigned_to = auth.uid()
  );
