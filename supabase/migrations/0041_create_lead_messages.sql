-- Migration 0041: Live Chatwoot message cache for active leads.

CREATE TABLE lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID NOT NULL REFERENCES leads(uuid) ON DELETE CASCADE,
  chatwoot_message_id INTEGER NOT NULL,
  chatwoot_conversation_id INTEGER NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('incoming', 'outgoing', 'activity')),
  content TEXT,
  sender_type TEXT CHECK (sender_type IN ('contact', 'user', 'system')),
  sender_id INTEGER,
  sender_name TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE lead_messages IS 'Chatwoot messages synced on-demand when Conversation tab is opened.';
COMMENT ON COLUMN lead_messages.synced_at IS 'Last upsert from Chatwoot API for this row.';

CREATE UNIQUE INDEX idx_lead_messages_chatwoot_msg_unique
  ON lead_messages (chatwoot_message_id);

CREATE INDEX idx_lead_messages_lead_created
  ON lead_messages (lead_uuid, created_at ASC);

CREATE INDEX idx_lead_messages_conversation
  ON lead_messages (chatwoot_conversation_id);

ALTER TABLE lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_messages_select ON lead_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.uuid = lead_messages.lead_uuid
        AND l.is_deleted = false
        AND l.is_archived = false
        AND (
          is_manager_or_superadmin()
          OR l.assigned_to = auth.uid()
          OR l.assigned_to IS NULL
        )
    )
  );

GRANT SELECT ON lead_messages TO authenticated;
