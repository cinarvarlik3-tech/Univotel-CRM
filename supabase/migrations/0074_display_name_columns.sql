-- Migration 0074: Editable display name with provenance (§1.1)
-- Adds auto_logged_name (immutable original) and display_name (human-editable) to leads.
-- Read rule: COALESCE(display_name, auto_logged_name, lead_name)
-- lead_name kept for backward-compat.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS auto_logged_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill: copy existing lead_name into auto_logged_name where not yet set.
UPDATE leads
SET auto_logged_name = lead_name
WHERE auto_logged_name IS NULL;

-- Index for display_name searches (optional, helps quick-search)
CREATE INDEX IF NOT EXISTS idx_leads_display_name ON leads USING gin(to_tsvector('simple', COALESCE(display_name, auto_logged_name, lead_name, '')));
