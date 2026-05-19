-- Migration 0009: Enable pg_trgm for fuzzy search and pg_cron for scheduled jobs.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify Turkish character handling after enabling:
-- SELECT similarity('ahmet', 'Ahmet');  -- should return > 0.3

CREATE INDEX idx_leads_lead_name_trgm ON leads USING GIN (lead_name gin_trgm_ops);
CREATE INDEX idx_leads_lead_phone_trgm ON leads USING GIN (lead_phone gin_trgm_ops);
CREATE INDEX idx_leads_notes_trgm ON leads USING GIN (notes gin_trgm_ops);
