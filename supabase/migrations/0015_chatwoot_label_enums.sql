-- Migration 0015: Align CHECK constraints with Chatwoot label vocabulary.
-- Order matters: drop old CHECKs → migrate data → add new CHECKs.

-- ---------------------------------------------------------------------------
-- Step 1: Drop constraints that block Turkish slug values during data migration
-- ---------------------------------------------------------------------------

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_funnel_status_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_student_stage_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_persona_type_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_special_state_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_source_check;
ALTER TABLE lead_details DROP CONSTRAINT IF EXISTS lead_details_uni_year_check;

-- ---------------------------------------------------------------------------
-- Step 2: Disable dorm_awaiting trigger during data migration
-- (multi-value arrays can contain old+new slugs between array_replace passes)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_lead_details_dorm_awaiting ON lead_details;

CREATE OR REPLACE FUNCTION enforce_loss_reason_on_lost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.funnel_status = 'ziyaret-ama-almayacak' AND NEW.loss_reason IS NULL THEN
    RAISE EXCEPTION 'loss_reason is required when funnel_status is ziyaret-ama-almayacak';
  END IF;

  IF NEW.funnel_status IS DISTINCT FROM 'ziyaret-ama-almayacak' AND NEW.loss_reason IS NOT NULL THEN
    NEW.loss_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Step 3: Migrate existing rows to new vocabulary
-- ---------------------------------------------------------------------------

-- Legacy English funnel_status → Turkish (0012 vocabulary)
UPDATE leads SET funnel_status = 'yeni' WHERE funnel_status = 'fresh';
UPDATE leads SET funnel_status = 'aranacak' WHERE funnel_status = 'qualified';
UPDATE leads SET funnel_status = 'arandi' WHERE funnel_status = 'contacted';
UPDATE leads SET funnel_status = 'ziyaret' WHERE funnel_status = 'tour_scheduled';
UPDATE leads SET funnel_status = 'ziyaret-etti' WHERE funnel_status = 'tour_completed';
UPDATE leads SET funnel_status = 'teklif-gonderildi' WHERE funnel_status IN ('proposal_sent', 'negotiation', 'contract_sent');
UPDATE leads SET funnel_status = 'kapora-alindi' WHERE funnel_status = 'deposit_received';
UPDATE leads SET funnel_status = 'sozlesme-imzalandi' WHERE funnel_status IN ('contract_signed', 'registered', 'won');
UPDATE leads SET funnel_status = 'ziyaret-ama-almayacak' WHERE funnel_status = 'lost';
UPDATE leads SET funnel_status = 'ilgilenmiyor' WHERE funnel_status = 'nurture';

-- Any remaining unknown funnel values → yeni (safe default)
UPDATE leads
SET funnel_status = 'yeni'
WHERE funnel_status NOT IN (
  'yeni', 'aranacak', 'arandi', 'arandi-acmadi', 'bizi-aradi-konustuk',
  'ziyaret', 'ziyaret-etmedi', 'ziyaret-etti', 'teklif-gonderildi',
  'kapora-alindi', 'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor'
);
UPDATE leads SET student_stage = 'pre-sinav' WHERE student_stage = 'pre_exam';
UPDATE leads SET student_stage = 'yerlesti' WHERE student_stage = 'placed';
UPDATE leads SET student_stage = 'yeni-giris' WHERE student_stage IN ('registered', 'moved_in', 'post_exam');
UPDATE leads SET special_state = 'ogrenci-degil' WHERE persona_type = 'ogrenci-degil';
UPDATE leads SET persona_type = NULL WHERE persona_type = 'ogrenci-degil';

UPDATE leads SET student_stage = 'unknown'
WHERE student_stage NOT IN ('pre-sinav', 'yerlesti', 'yeni-giris', 'erasmus', 'unknown');

UPDATE leads SET special_state = NULL WHERE special_state = 'erasmus';
UPDATE leads SET special_state = NULL
WHERE special_state IS NOT NULL
  AND special_state NOT IN ('univotelli', 'ogrenci-degil');

UPDATE leads SET lead_source = 'manual'
WHERE lead_source NOT IN (
  'whatsapp', 'instagram', 'netgsm_call', 'whatsapp_call', 'manual', 'form',
  'google-ads', 'meta-ads', 'google-maps', 'sahibinden'
);

-- Remap all legacy dorm_awaiting elements in one pass (avoids mixed old/new arrays)
UPDATE lead_details
SET dorm_awaiting = COALESCE(
  (
    SELECT array_agg(
      CASE elem
        WHEN 'kyk' THEN 'kyk-sonuc-bekliyor'
        WHEN 'universite' THEN 'universite-yurdu-sonuc-bekliyor'
        WHEN 'ibb' THEN 'ibb-yurdu-sonuc-bekliyor'
        ELSE elem
      END
      ORDER BY ord
    )
    FROM unnest(dorm_awaiting) WITH ORDINALITY AS t(elem, ord)
  ),
  '{}'
)
WHERE dorm_awaiting && ARRAY['kyk', 'universite', 'ibb']::text[];

-- Map legacy uni_year values if present
UPDATE lead_details SET uni_year = '1-sinif' WHERE uni_year = '1';
UPDATE lead_details SET uni_year = '2-sinif' WHERE uni_year = '2';
UPDATE lead_details SET uni_year = '3-sinif' WHERE uni_year = '3';
UPDATE lead_details SET uni_year = '4-sinif' WHERE uni_year = '4';
UPDATE lead_details SET uni_year = NULL WHERE uni_year = 'erasmus';

UPDATE lead_details
SET dorm_awaiting = '{}'
WHERE EXISTS (
  SELECT 1 FROM unnest(dorm_awaiting) AS elem
  WHERE elem NOT IN (
    'kyk-sonuc-bekliyor',
    'universite-yurdu-sonuc-bekliyor',
    'ibb-yurdu-sonuc-bekliyor'
  )
);

UPDATE lead_details SET uni_year = NULL
WHERE uni_year IS NOT NULL
  AND uni_year NOT IN ('1-sinif', '2-sinif', '3-sinif', '4-sinif', 'universitede');

-- ---------------------------------------------------------------------------
-- Step 4: Restore dorm_awaiting validator + trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_dorm_awaiting(arr TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  IF arr IS NULL OR cardinality(arr) = 0 THEN
    RETURN TRUE;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM unnest(arr) AS elem
    WHERE elem NOT IN (
      'kyk-sonuc-bekliyor',
      'universite-yurdu-sonuc-bekliyor',
      'ibb-yurdu-sonuc-bekliyor'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION trg_validate_dorm_awaiting()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_dorm_awaiting(NEW.dorm_awaiting) THEN
    RAISE EXCEPTION 'Invalid dorm_awaiting value — allowed: kyk-sonuc-bekliyor, universite-yurdu-sonuc-bekliyor, ibb-yurdu-sonuc-bekliyor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_details_dorm_awaiting
  BEFORE INSERT OR UPDATE OF dorm_awaiting ON lead_details
  FOR EACH ROW
  EXECUTE PROCEDURE trg_validate_dorm_awaiting();

-- ---------------------------------------------------------------------------
-- Step 5: Add new CHECK constraints (idempotent for re-runs)
-- ---------------------------------------------------------------------------

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_source_check CHECK (
  lead_source IN (
    'whatsapp', 'instagram', 'netgsm_call', 'whatsapp_call', 'manual', 'form',
    'google-ads', 'meta-ads', 'google-maps', 'sahibinden'
  )
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_funnel_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_funnel_status_check CHECK (
  funnel_status IN (
    'yeni', 'aranacak', 'arandi', 'arandi-acmadi', 'bizi-aradi-konustuk',
    'ziyaret', 'ziyaret-etmedi', 'ziyaret-etti', 'teklif-gonderildi',
    'kapora-alindi', 'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor'
  )
);

ALTER TABLE leads ALTER COLUMN funnel_status SET DEFAULT 'yeni';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_special_state_check;
ALTER TABLE leads ADD CONSTRAINT leads_special_state_check CHECK (
  special_state IS NULL OR special_state IN ('univotelli', 'ogrenci-degil')
);

ALTER TABLE lead_details DROP CONSTRAINT IF EXISTS lead_details_uni_year_check;
ALTER TABLE lead_details ADD CONSTRAINT lead_details_uni_year_check CHECK (
  uni_year IS NULL OR uni_year IN ('1-sinif', '2-sinif', '3-sinif', '4-sinif', 'universitede')
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_student_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_student_stage_check CHECK (
  student_stage IN ('pre-sinav', 'yerlesti', 'yeni-giris', 'erasmus', 'unknown')
);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_persona_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_persona_type_check CHECK (
  persona_type IS NULL OR persona_type IN ('ogrenci', 'veli')
);

-- ---------------------------------------------------------------------------
-- Step 6: SLA cron — terminal funnel statuses (Turkish slugs)
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
    AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor');
  $$
);
