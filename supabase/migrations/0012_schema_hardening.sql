-- Migration 0012: Schema hardening — CHECK constraints, missing index, RLS view fix, RPC grants.
--
-- Pre-migration validation (run on non-empty DBs before applying):
--   SELECT DISTINCT lead_source FROM leads WHERE lead_source NOT IN ('whatsapp','instagram','netgsm_call','whatsapp_call','manual','form');
--   SELECT DISTINCT funnel_status FROM leads WHERE funnel_status NOT IN ('fresh','contacted','qualified','tour_scheduled','tour_completed','proposal_sent','negotiation','contract_sent','contract_signed','deposit_received','registered','won','lost','nurture');
--   SELECT uuid FROM leads WHERE funnel_status = 'lost' AND loss_reason IS NULL;
--   SELECT lead_uuid FROM lead_details WHERE NOT validate_dorm_awaiting(dorm_awaiting);

-- ---------------------------------------------------------------------------
-- Section A: Helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_dorm_awaiting(arr TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  IF arr IS NULL OR cardinality(arr) = 0 THEN
    RETURN TRUE;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM unnest(arr) AS elem
    WHERE elem NOT IN ('kyk', 'universite', 'ibb')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_dorm_awaiting IS 'Returns true if dorm_awaiting array is empty or all elements are kyk/universite/ibb.';

CREATE OR REPLACE FUNCTION enforce_loss_reason_on_lost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.funnel_status = 'lost' AND NEW.loss_reason IS NULL THEN
    RAISE EXCEPTION 'loss_reason is required when funnel_status is lost';
  END IF;

  IF NEW.funnel_status IS DISTINCT FROM 'lost' AND NEW.loss_reason IS NOT NULL THEN
    NEW.loss_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_loss_reason_on_lost IS 'Requires loss_reason when funnel_status is lost; clears loss_reason otherwise.';

CREATE OR REPLACE FUNCTION trg_validate_dorm_awaiting()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_dorm_awaiting(NEW.dorm_awaiting) THEN
    RAISE EXCEPTION 'Invalid dorm_awaiting value — allowed: kyk, universite, ibb';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Section B: leads CHECK constraints
-- ---------------------------------------------------------------------------

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_source_check CHECK (
  lead_source IN ('whatsapp', 'instagram', 'netgsm_call', 'whatsapp_call', 'manual', 'form')
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_message_from_check;
ALTER TABLE leads ADD CONSTRAINT leads_message_from_check CHECK (
  message_from IS NULL OR message_from IN ('whatsapp', 'instagram', 'netgsm', 'manual', 'form')
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_funnel_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_funnel_status_check CHECK (
  funnel_status IN (
    'fresh', 'contacted', 'qualified', 'tour_scheduled', 'tour_completed',
    'proposal_sent', 'negotiation', 'contract_sent', 'contract_signed',
    'deposit_received', 'registered', 'won', 'lost', 'nurture'
  )
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_special_state_check;
ALTER TABLE leads ADD CONSTRAINT leads_special_state_check CHECK (
  special_state IS NULL OR special_state IN ('univotelli', 'erasmus')
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_score_range_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_score_range_check CHECK (
  lead_score >= 0 AND lead_score <= 100
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_loss_reason_check;
ALTER TABLE leads ADD CONSTRAINT leads_loss_reason_check CHECK (
  loss_reason IS NULL OR loss_reason IN (
    'price', 'location', 'competitor', 'no_response', 'not_student',
    'already_placed', 'timing', 'other'
  )
);

-- ---------------------------------------------------------------------------
-- Section C: lead_details dorm_awaiting trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_lead_details_dorm_awaiting ON lead_details;
CREATE TRIGGER trg_lead_details_dorm_awaiting
  BEFORE INSERT OR UPDATE OF dorm_awaiting ON lead_details
  FOR EACH ROW
  EXECUTE PROCEDURE trg_validate_dorm_awaiting();

-- ---------------------------------------------------------------------------
-- Section D: leads loss_reason trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_leads_loss_reason_required ON leads;
CREATE TRIGGER trg_leads_loss_reason_required
  BEFORE INSERT OR UPDATE OF funnel_status, loss_reason ON leads
  FOR EACH ROW
  EXECUTE PROCEDURE enforce_loss_reason_on_lost();

-- ---------------------------------------------------------------------------
-- Section E: Missing index (Plan §4)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_contact_history_status_changed
  ON contact_history (status_changed);

-- ---------------------------------------------------------------------------
-- Section F: lead_details_safe view with security_invoker
-- ---------------------------------------------------------------------------

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

COMMENT ON VIEW lead_details_safe IS 'KVKK-safe lead_details; runs as invoking user (security_invoker).';

GRANT SELECT ON lead_details_safe TO authenticated;

-- ---------------------------------------------------------------------------
-- Section G: increment_active_lead_count grant lockdown
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION increment_active_lead_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_active_lead_count(UUID) TO service_role;
