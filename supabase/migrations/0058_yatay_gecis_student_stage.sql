-- Migration 0058: Add 'yatay-gecis-bekliyor' student stage.
-- Chatwoot label yatay_geçiş_bekliyor maps to this stage via CHATWOOT_STUDENT_STAGE_LABEL_MAP.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_student_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_student_stage_check CHECK (
  student_stage IN (
    'pre-sinav', 'yerlesti', 'yeni-giris', 'erasmus',
    'yatay-gecis-bekliyor', 'unknown'
  )
);
