-- Migration 0061: Replace budget_min with budget_tier; keep budget_max for rec engine (derived in app).

ALTER TABLE lead_details
  ADD COLUMN IF NOT EXISTS budget_tier TEXT;

ALTER TABLE lead_details
  DROP CONSTRAINT IF EXISTS lead_details_budget_tier_check;

ALTER TABLE lead_details
  ADD CONSTRAINT lead_details_budget_tier_check
  CHECK (
    budget_tier IS NULL
    OR budget_tier = ANY (
      ARRAY[
        'dusuk-butce'::text,
        'ortalama'::text,
        'yuksek-butce'::text,
        'cok-yuksek-butce'::text,
        'anlasilmiyor'::text
      ]
    )
  );

-- Backfill tier from legacy budget_max where possible (rough bands).
UPDATE lead_details
SET budget_tier = CASE
  WHEN budget_max IS NULL THEN NULL
  WHEN budget_max < 20000 THEN 'dusuk-butce'
  WHEN budget_max < 30000 THEN 'ortalama'
  WHEN budget_max < 45000 THEN 'yuksek-butce'
  ELSE 'cok-yuksek-butce'
END
WHERE budget_tier IS NULL
  AND budget_max IS NOT NULL;

-- View must be dropped before removing columns it selects.
DROP VIEW IF EXISTS lead_details_safe;

ALTER TABLE lead_details
  DROP COLUMN IF EXISTS budget_min;

CREATE VIEW lead_details_safe
WITH (security_invoker = true)
AS
SELECT
  ld.lead_uuid,
  ld.university,
  ld.school_shortname,
  ld.interested_hotel,
  ld.rec_hotel,
  ld.room_type,
  ld.budget_tier,
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

COMMENT ON COLUMN lead_details.budget_tier IS 'Chatwoot butce list tier slug; budget_max is derived for rec engine.';
