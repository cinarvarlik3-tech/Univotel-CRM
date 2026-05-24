-- Migration 0023: Two-way Chatwoot sync — label echo guard, contact id, sync log.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS chatwoot_contact_id INTEGER,
  ADD COLUMN IF NOT EXISTS label_sync_source TEXT CHECK (label_sync_source IN ('chatwoot', 'crm')),
  ADD COLUMN IF NOT EXISTS label_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN leads.chatwoot_contact_id IS 'Chatwoot contact id for contact API sync.';
COMMENT ON COLUMN leads.label_sync_source IS 'Last label write origin: chatwoot or crm (echo guard).';
COMMENT ON COLUMN leads.label_synced_at IS 'Timestamp of last label sync.';

CREATE TABLE IF NOT EXISTS chatwoot_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID REFERENCES leads (uuid) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  operation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatwoot_sync_log_lead_uuid
  ON chatwoot_sync_log (lead_uuid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatwoot_sync_log_created_at
  ON chatwoot_sync_log (created_at DESC);

COMMENT ON TABLE chatwoot_sync_log IS 'Audit log for CRM ↔ Chatwoot sync operations.';
