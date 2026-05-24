-- Migration 0028: Phase 3 — archived_contact_history mirror table.

CREATE TABLE archived_contact_history (
  id UUID PRIMARY KEY,
  lead_uuid UUID NOT NULL REFERENCES archived_leads(uuid) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (
    interaction_type IN (
      'call_success',
      'call_fail',
      'message_sent',
      'message_received',
      'whatsapp_call',
      'status_change',
      'duplicate_submission',
      'reassignment',
      'form_submitted',
      'callback_scheduled',
      'correction'
    )
  ),
  interaction_source TEXT CHECK (
    interaction_source IS NULL OR interaction_source IN ('whatsapp', 'instagram', 'netgsm', 'manual')
  ),
  funnel_status_at_time TEXT,
  previous_status TEXT,
  status_changed BOOLEAN NOT NULL DEFAULT false,
  salesperson_id UUID REFERENCES salespeople(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_archived_contact_history_lead_uuid ON archived_contact_history (lead_uuid);
CREATE INDEX idx_archived_contact_history_created_at ON archived_contact_history (created_at DESC);

ALTER TABLE archived_contact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY archived_contact_history_manager_select ON archived_contact_history
  FOR SELECT USING (
    get_user_role() = 'manager'
    AND EXISTS (
      SELECT 1 FROM archived_leads al
      WHERE al.uuid = archived_contact_history.lead_uuid
    )
  );

COMMENT ON TABLE archived_contact_history IS 'Contact history for archived leads; migrated from contact_history on archive.';

GRANT SELECT ON archived_contact_history TO authenticated;
