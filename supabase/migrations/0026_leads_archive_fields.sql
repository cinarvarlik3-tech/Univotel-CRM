-- Migration 0026: Phase 3 — archive flags on leads, RLS, indexes, and active-query updates.

ALTER TABLE leads
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX idx_leads_is_archived ON leads (is_archived) WHERE is_archived = true;
CREATE INDEX idx_leads_active_created ON leads (created_at DESC)
  WHERE is_deleted = false AND is_archived = false;

DROP INDEX IF EXISTS idx_leads_lead_phone_active;
CREATE UNIQUE INDEX idx_leads_lead_phone_active ON leads (lead_phone)
  WHERE is_deleted = false AND is_archived = false;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_loss_reason_check;
ALTER TABLE leads ADD CONSTRAINT leads_loss_reason_check CHECK (
  loss_reason IS NULL OR loss_reason IN (
    'price', 'location', 'competitor', 'no_response', 'not_student',
    'already_placed', 'timing', 'other', 'sure-asildi'
  )
);

CREATE OR REPLACE VIEW active_leads AS
  SELECT * FROM leads
  WHERE is_deleted = false AND is_archived = false;

COMMENT ON VIEW active_leads IS 'Non-deleted, non-archived leads for service-role queries.';

-- ---------------------------------------------------------------------------
-- RLS: hide archived leads from active CRM views
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS leads_select_assigned ON leads;
CREATE POLICY leads_select_assigned ON leads
  FOR SELECT USING (
    is_deleted = false
    AND is_archived = false
    AND (
      get_user_role() = 'manager'
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  );

DROP POLICY IF EXISTS leads_update_assigned ON leads;
CREATE POLICY leads_update_assigned ON leads
  FOR UPDATE USING (
    is_deleted = false
    AND is_archived = false
    AND (
      get_user_role() = 'manager'
      OR assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS lead_details_select ON lead_details;
CREATE POLICY lead_details_select ON lead_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

CREATE POLICY lead_details_select_archived ON lead_details
  FOR SELECT USING (
    get_user_role() = 'manager'
    AND EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_archived = true
        AND l.is_deleted = false
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
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

DROP POLICY IF EXISTS lead_details_insert ON lead_details;
CREATE POLICY lead_details_insert ON lead_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_details.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
          OR l.lead_source = 'manual'
        )
    )
  );

DROP POLICY IF EXISTS contact_history_select ON contact_history;
CREATE POLICY contact_history_select ON contact_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = contact_history.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          get_user_role() = 'manager'
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
          get_user_role() = 'manager'
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

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
    WHEN get_user_role() = 'manager' THEN ld.student_gender
    WHEN EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = ld.lead_uuid
        AND l.assigned_to = auth.uid()
        AND l.is_archived = false
    ) THEN ld.student_gender
    ELSE NULL
  END AS student_gender,
  CASE
    WHEN get_user_role() = 'manager' THEN ld.nationality
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

-- ---------------------------------------------------------------------------
-- Trigram search — active leads only
-- ---------------------------------------------------------------------------

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
      get_user_role() = 'manager'
      OR l.assigned_to = auth.uid()
      OR l.assigned_to IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- SLA cron — exclude archived leads
-- ---------------------------------------------------------------------------

SELECT cron.unschedule('sla_update');
SELECT cron.schedule(
  'sla_update',
  '*/5 * * * *',
  $$
  UPDATE leads SET sla_status =
    CASE
      WHEN last_contact_at IS NOT NULL THEN 'on_time'
      WHEN sla_deadline < NOW() THEN 'breached'
      WHEN sla_deadline < NOW() + INTERVAL '5 minutes' THEN 'at_risk'
      ELSE 'on_time'
    END
  WHERE is_deleted = false
    AND is_archived = false
    AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor');
  $$
);
