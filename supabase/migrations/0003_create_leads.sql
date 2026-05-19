-- Migration 0003: Create leads table — central CRM record.

CREATE TABLE leads (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_source TEXT NOT NULL CHECK (
    lead_source IN ('whatsapp', 'instagram', 'netgsm_call', 'whatsapp_call', 'manual')
  ),
  message_from TEXT CHECK (
    message_from IN ('whatsapp', 'instagram', 'netgsm', 'manual')
  ),
  is_organic BOOLEAN,
  lead_name TEXT,
  lead_phone TEXT NOT NULL,
  funnel_status TEXT NOT NULL DEFAULT 'fresh',
  student_stage TEXT NOT NULL DEFAULT 'unknown' CHECK (
    student_stage IN ('pre_exam', 'post_exam', 'placed', 'registered', 'moved_in', 'unknown')
  ),
  persona_type TEXT CHECK (persona_type IN ('ogrenci', 'veli', 'ogrenci-degil')),
  special_state TEXT,
  assigned_to UUID REFERENCES salespeople(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'tr',
  source_details JSONB NOT NULL DEFAULT '{}',
  parent_phone TEXT,
  sla_deadline TIMESTAMPTZ,
  sla_status TEXT NOT NULL DEFAULT 'on_time' CHECK (
    sla_status IN ('on_time', 'at_risk', 'breached')
  ),
  lead_score INTEGER NOT NULL DEFAULT 0,
  loss_reason TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  sla_breach_alerted_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION set_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE PROCEDURE set_leads_updated_at();

CREATE VIEW active_leads AS
  SELECT * FROM leads WHERE is_deleted = false;

COMMENT ON TABLE leads IS 'Core lead records ingested from webhooks and manual entry.';
COMMENT ON VIEW active_leads IS 'Non-deleted leads for service-role queries.';
