-- Migration 0064: visits table for Major Update.
--
-- Tracks scheduled, attended, and failed property visits.
-- One row per visit attempt — rescheduling creates a new row (history preserved).
-- RLS: all authenticated salespeople can READ all visits (cross-property calendar).
--      INSERT/UPDATE restricted to the lead's assignee or manager+.

CREATE TABLE IF NOT EXISTS visits (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid       UUID        NOT NULL REFERENCES leads(uuid) ON DELETE CASCADE,
  property_id     UUID        NOT NULL REFERENCES properties(id),
  scheduled_date  TIMESTAMPTZ NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled', 'attended', 'failed')),
  notes           TEXT,
  created_by      UUID        REFERENCES salespeople(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns.
CREATE INDEX IF NOT EXISTS idx_visits_lead
  ON visits(lead_uuid);

CREATE INDEX IF NOT EXISTS idx_visits_property_date
  ON visits(property_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_visits_status
  ON visits(status);

CREATE INDEX IF NOT EXISTS idx_visits_scheduled_date
  ON visits(scheduled_date);

-- Row-level security.
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all visits (needed for cross-property calendars).
DROP POLICY IF EXISTS "visits_select_authenticated" ON visits;
CREATE POLICY "visits_select_authenticated" ON visits
  FOR SELECT TO authenticated USING (true);

-- Insert: lead must be assigned to the user, or user is manager/superadmin.
DROP POLICY IF EXISTS "visits_insert" ON visits;
CREATE POLICY "visits_insert" ON visits
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.uuid = lead_uuid
        AND (
          leads.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM salespeople
            WHERE salespeople.id = auth.uid()
              AND salespeople.role IN ('manager', 'superadmin')
          )
        )
    )
  );

-- Update: same condition as insert.
DROP POLICY IF EXISTS "visits_update" ON visits;
CREATE POLICY "visits_update" ON visits
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.uuid = lead_uuid
        AND (
          leads.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM salespeople
            WHERE salespeople.id = auth.uid()
              AND salespeople.role IN ('manager', 'superadmin')
          )
        )
    )
  );
