-- Migration 0035: Phase 4 — dni_numbers table for Dynamic Number Insertion.

CREATE TABLE dni_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_number TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (
    source IN (
      'google-ads',
      'meta-ads',
      'organic',
      'ituyurt',
      'galatasarayyurt',
      'kampushan',
      'academic-house'
    )
  ),
  display_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  lead_count INTEGER NOT NULL DEFAULT 0,
  last_lead_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX dni_numbers_is_active_idx ON dni_numbers (is_active) WHERE is_active = true;
CREATE INDEX dni_numbers_source_idx ON dni_numbers (source);

ALTER TABLE dni_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY dni_numbers_superadmin_all ON dni_numbers
  FOR ALL USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY dni_numbers_manager_select ON dni_numbers
  FOR SELECT USING (is_manager_or_superadmin());

-- Placeholder rows (inactive until NetGSM numbers are configured)
INSERT INTO dni_numbers (virtual_number, source, display_label, is_active) VALUES
  ('+908500000001', 'google-ads', 'Google Ads', false),
  ('+908500000002', 'meta-ads', 'Meta Ads', false),
  ('+908500000003', 'organic', 'Organic', false),
  ('+908500000004', 'ituyurt', 'ITU Yurt', false),
  ('+908500000005', 'galatasarayyurt', 'Galatasaray Yurt', false),
  ('+908500000006', 'kampushan', 'Kampushan', false),
  ('+908500000007', 'academic-house', 'Academic House', false);
