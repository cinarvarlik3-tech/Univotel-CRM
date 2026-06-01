-- Migration 0046: Drop redundant lead_details.gender (consolidated onto student_gender).

DROP VIEW IF EXISTS lead_details_safe;

ALTER TABLE lead_details
  DROP CONSTRAINT IF EXISTS lead_details_gender_check;

ALTER TABLE lead_details
  DROP COLUMN gender;

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
  ld.campus,
  ld.room_category,
  ld.district_preference,
  ld.created_at,
  ld.updated_at
FROM lead_details ld;

COMMENT ON VIEW lead_details_safe IS 'KVKK-safe lead_details; runs as invoking user (security_invoker).';

GRANT SELECT ON lead_details_safe TO authenticated;
