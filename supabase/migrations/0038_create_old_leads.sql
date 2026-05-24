-- Migration 0038: Historical Chatwoot import tables (old_leads / old_lead_details).
-- Mirrors active leads schema but without unique lead_phone — supports duplicate placeholders
-- and multiple Instagram handles imported in bulk.

CREATE TABLE old_leads (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_source TEXT NOT NULL CHECK (
    lead_source IN (
      'whatsapp', 'instagram', 'netgsm_call', 'whatsapp_call', 'manual', 'form',
      'google-ads', 'meta-ads', 'google-maps', 'sahibinden'
    )
  ),
  message_from TEXT CHECK (
    message_from IN ('whatsapp', 'instagram', 'netgsm', 'manual', 'form')
  ),
  is_organic BOOLEAN,
  lead_name TEXT,
  lead_phone TEXT NOT NULL,
  parent_phone TEXT,
  funnel_status TEXT NOT NULL DEFAULT 'yeni' CHECK (
    funnel_status IN (
      'yeni', 'aranacak', 'arandi', 'arandi-acmadi', 'bizi-aradi-konustuk',
      'ziyaret', 'ziyaret-etmedi', 'ziyaret-etti', 'teklif-gonderildi',
      'kapora-alindi', 'sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor'
    )
  ),
  student_stage TEXT NOT NULL DEFAULT 'unknown' CHECK (
    student_stage IN ('pre-sinav', 'yerlesti', 'yeni-giris', 'erasmus', 'unknown')
  ),
  persona_type TEXT CHECK (persona_type IS NULL OR persona_type IN ('ogrenci', 'veli')),
  special_state TEXT CHECK (special_state IS NULL OR special_state IN ('univotelli', 'ogrenci-degil')),
  assigned_to UUID REFERENCES salespeople(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'tr',
  source_details JSONB NOT NULL DEFAULT '{}',
  sla_deadline TIMESTAMPTZ,
  sla_status TEXT NOT NULL DEFAULT 'on_time' CHECK (
    sla_status IN ('on_time', 'at_risk', 'breached')
  ),
  sla_breach_alerted_at TIMESTAMPTZ,
  lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  loss_reason TEXT CHECK (
    loss_reason IS NULL OR loss_reason IN (
      'price', 'location', 'competitor', 'no_response', 'not_student',
      'already_placed', 'timing', 'other', 'sure-asildi'
    )
  ),
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  chatwoot_conversation_id INTEGER,
  chatwoot_contact_id INTEGER,
  assignee_sync_source TEXT CHECK (assignee_sync_source IN ('chatwoot', 'crm')),
  assignee_synced_at TIMESTAMPTZ,
  label_sync_source TEXT CHECK (label_sync_source IN ('chatwoot', 'crm')),
  label_synced_at TIMESTAMPTZ
);

COMMENT ON TABLE old_leads IS 'Historical leads imported from Chatwoot; read-only archive separate from active pipeline.';
COMMENT ON COLUMN old_leads.lead_phone IS 'Turkish mobile, international phone, or Instagram handle depending on message_from.';

CREATE OR REPLACE FUNCTION set_old_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER old_leads_updated_at
  BEFORE UPDATE ON old_leads
  FOR EACH ROW
  EXECUTE PROCEDURE set_old_leads_updated_at();

CREATE INDEX idx_old_leads_created_at ON old_leads (created_at DESC);
CREATE INDEX idx_old_leads_lead_source ON old_leads (lead_source);
CREATE INDEX idx_old_leads_message_from ON old_leads (message_from);
CREATE INDEX idx_old_leads_lead_phone ON old_leads (lead_phone);
CREATE INDEX idx_old_leads_chatwoot_conversation_id ON old_leads (chatwoot_conversation_id)
  WHERE chatwoot_conversation_id IS NOT NULL;
CREATE INDEX idx_old_leads_chatwoot_contact_id ON old_leads (chatwoot_contact_id)
  WHERE chatwoot_contact_id IS NOT NULL;

CREATE INDEX idx_old_leads_lead_name_trgm ON old_leads
  USING gin (lead_name gin_trgm_ops);
CREATE INDEX idx_old_leads_lead_phone_trgm ON old_leads
  USING gin (lead_phone gin_trgm_ops);

CREATE TABLE old_lead_details (
  lead_uuid UUID PRIMARY KEY REFERENCES old_leads(uuid) ON DELETE CASCADE,
  university TEXT,
  interested_hotel TEXT[] NOT NULL DEFAULT '{}',
  rec_hotel TEXT,
  room_type TEXT[] NOT NULL DEFAULT '{}',
  budget_min INTEGER,
  budget_max INTEGER,
  move_in DATE,
  dorm_awaiting TEXT[] NOT NULL DEFAULT '{}',
  uni_year TEXT CHECK (
    uni_year IS NULL OR uni_year IN ('1-sinif', '2-sinif', '3-sinif', '4-sinif', 'universitede')
  ),
  parent_name TEXT,
  kvkk_opt_in BOOLEAN,
  marketing_opt_in BOOLEAN,
  student_gender TEXT CHECK (student_gender IS NULL OR student_gender IN ('male', 'female', 'other')),
  nationality TEXT,
  preferred_district TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE old_lead_details IS 'Extended profile for old_leads imports; one row per old lead.';

CREATE OR REPLACE FUNCTION set_old_lead_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER old_lead_details_updated_at
  BEFORE UPDATE ON old_lead_details
  FOR EACH ROW
  EXECUTE PROCEDURE set_old_lead_details_updated_at();

ALTER TABLE old_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE old_lead_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY old_leads_manager_select ON old_leads
  FOR SELECT USING (get_user_role() IN ('manager', 'superadmin'));

CREATE POLICY old_lead_details_manager_select ON old_lead_details
  FOR SELECT USING (
    get_user_role() IN ('manager', 'superadmin')
    AND EXISTS (
      SELECT 1 FROM old_leads ol WHERE ol.uuid = old_lead_details.lead_uuid
    )
  );

GRANT SELECT ON old_leads TO authenticated;
GRANT SELECT ON old_lead_details TO authenticated;
