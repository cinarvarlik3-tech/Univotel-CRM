-- Migration 0002: Create properties table for hotel inventory.

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name TEXT NOT NULL,
  address TEXT,
  district TEXT,
  serviced_gender TEXT CHECK (serviced_gender IN ('male', 'female', 'mixed')),
  serviced_schools TEXT[] NOT NULL DEFAULT '{}',
  total_beds INTEGER,
  accepts_non_students BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  google_sheet_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE PROCEDURE set_properties_updated_at();

COMMENT ON TABLE properties IS 'Hotel/dorm inventory used for recommendations and assignment filtering.';
