-- Migration 0065: Lead details date field changes for Major Update.
--
-- lead_details.move_in: TEXT → DATE (planned move-in date).
--   Existing text values are converted where parseable, NULL where not.
--   Gating: only meaningful when funnel_status is kapora-alindi or sozlesme-imzalandi
--   (enforced at application level, not DB constraint, to avoid retroactive breakage).
--
-- lead_details.actual_move_in_date: new DATE column (nullable).
--   Set when lead physically moves in. Setting this triggers leads.has_moved_in = true
--   via application logic in lib/leads/update-lead.ts.

-- Rename old TEXT column only if it still exists as TEXT (idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_details'
      AND column_name = 'move_in'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE lead_details RENAME COLUMN move_in TO move_in_text_legacy;
  END IF;
END $$;

-- Add new DATE column.
ALTER TABLE lead_details ADD COLUMN IF NOT EXISTS move_in DATE;

-- Backfill: parse ISO-8601 text values where the legacy column still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_details'
      AND column_name = 'move_in_text_legacy'
  ) THEN
    UPDATE lead_details
    SET move_in = move_in_text_legacy::DATE
    WHERE move_in_text_legacy IS NOT NULL
      AND move_in_text_legacy ~ '^\d{4}-\d{2}-\d{2}$'
      AND move_in IS NULL;
  END IF;
END $$;

-- Drop the legacy text column.
ALTER TABLE lead_details DROP COLUMN IF EXISTS move_in_text_legacy;

-- Add actual_move_in_date column.
ALTER TABLE lead_details ADD COLUMN IF NOT EXISTS actual_move_in_date DATE;

-- Index for move-in calendar queries.
CREATE INDEX IF NOT EXISTS idx_lead_details_move_in
  ON lead_details(move_in) WHERE move_in IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_details_actual_move_in
  ON lead_details(actual_move_in_date) WHERE actual_move_in_date IS NOT NULL;
