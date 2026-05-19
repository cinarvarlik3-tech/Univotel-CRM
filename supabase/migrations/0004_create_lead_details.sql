-- Migration 0004: Create lead_details table for extended lead profile data.

CREATE TABLE lead_details (
  lead_uuid UUID PRIMARY KEY REFERENCES leads(uuid) ON DELETE CASCADE,
  university TEXT,
  interested_hotel TEXT[] NOT NULL DEFAULT '{}',
  rec_hotel TEXT,
  room_type TEXT[] NOT NULL DEFAULT '{}',
  budget_min INTEGER,
  budget_max INTEGER,
  move_in DATE,
  dorm_awaiting TEXT[] NOT NULL DEFAULT '{}',
  uni_year TEXT CHECK (
    uni_year IN ('1', '2', '3', '4', 'universitede', 'erasmus')
  ),
  parent_name TEXT,
  kvkk_opt_in BOOLEAN,
  marketing_opt_in BOOLEAN,
  student_gender TEXT CHECK (student_gender IN ('male', 'female', 'other')),
  nationality TEXT,
  preferred_district TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_lead_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_details_updated_at
  BEFORE UPDATE ON lead_details
  FOR EACH ROW
  EXECUTE PROCEDURE set_lead_details_updated_at();

COMMENT ON TABLE lead_details IS 'Extended lead profile. One row per lead, created on lead insert.';
