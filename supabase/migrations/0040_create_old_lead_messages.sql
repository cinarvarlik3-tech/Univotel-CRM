-- Migration 0040: Historical Chatwoot message import for old leads.

CREATE TABLE old_lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID NOT NULL REFERENCES old_leads(uuid) ON DELETE CASCADE,
  chatwoot_message_id INTEGER NOT NULL,
  chatwoot_conversation_id INTEGER NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('incoming', 'outgoing', 'activity')),
  content TEXT,
  sender_type TEXT CHECK (sender_type IN ('contact', 'user', 'system')),
  sender_id INTEGER,
  sender_name TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE old_lead_messages IS 'Chatwoot message history imported for old_leads; read-only.';
COMMENT ON COLUMN old_lead_messages.sender_name IS 'Agent display name (outgoing) or lead name (incoming) at import time.';

CREATE UNIQUE INDEX idx_old_lead_messages_chatwoot_msg_unique
  ON old_lead_messages (chatwoot_message_id);

CREATE INDEX idx_old_lead_messages_lead_created
  ON old_lead_messages (lead_uuid, created_at ASC);

CREATE INDEX idx_old_lead_messages_conversation
  ON old_lead_messages (chatwoot_conversation_id);

ALTER TABLE old_lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY old_lead_messages_manager_select ON old_lead_messages
  FOR SELECT USING (
    get_user_role() IN ('manager', 'superadmin')
    AND EXISTS (
      SELECT 1 FROM old_leads ol WHERE ol.uuid = old_lead_messages.lead_uuid
    )
  );

GRANT SELECT ON old_lead_messages TO authenticated;
