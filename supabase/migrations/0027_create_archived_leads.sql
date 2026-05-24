-- Migration 0027: Phase 3 — archived_leads snapshot table.

CREATE TABLE archived_leads (
  uuid UUID PRIMARY KEY,
  archive_reason TEXT NOT NULL CHECK (archive_reason IN ('won', 'lost')),
  loss_reason TEXT,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by TEXT NOT NULL,
  lead_name TEXT,
  lead_phone TEXT NOT NULL,
  lead_source TEXT NOT NULL,
  message_from TEXT,
  is_organic BOOLEAN,
  funnel_status TEXT NOT NULL,
  student_stage TEXT NOT NULL,
  persona_type TEXT,
  special_state TEXT,
  assigned_to UUID REFERENCES salespeople(id) ON DELETE SET NULL,
  language TEXT NOT NULL,
  source_details JSONB NOT NULL DEFAULT '{}',
  parent_phone TEXT,
  lead_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  last_contact_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT archived_leads_loss_reason_won CHECK (
    archive_reason = 'lost' OR loss_reason IS NULL
  )
);

CREATE INDEX idx_archived_leads_archive_reason ON archived_leads (archive_reason);
CREATE INDEX idx_archived_leads_assigned_to ON archived_leads (assigned_to);
CREATE INDEX idx_archived_leads_archived_at ON archived_leads (archived_at DESC);
CREATE INDEX idx_archived_leads_created_at ON archived_leads (created_at DESC);
CREATE INDEX idx_archived_leads_lead_source ON archived_leads (lead_source);

CREATE INDEX idx_archived_leads_lead_name_trgm ON archived_leads
  USING gin (lead_name gin_trgm_ops);
CREATE INDEX idx_archived_leads_lead_phone_trgm ON archived_leads
  USING gin (lead_phone gin_trgm_ops);

ALTER TABLE archived_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY archived_leads_manager_select ON archived_leads
  FOR SELECT USING (get_user_role() = 'manager');

COMMENT ON TABLE archived_leads IS 'Terminal lead snapshots moved out of active CRM views.';

GRANT SELECT ON archived_leads TO authenticated;
