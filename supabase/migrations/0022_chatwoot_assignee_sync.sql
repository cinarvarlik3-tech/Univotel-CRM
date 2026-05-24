-- Migration 0022: Chatwoot two-way assignee sync — identity mapping and loop guard columns.

ALTER TABLE salespeople
  ADD COLUMN IF NOT EXISTS chatwoot_user_id INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS chatwoot_agent_email TEXT;

COMMENT ON COLUMN salespeople.chatwoot_user_id IS 'Chatwoot agent user id for assignee API and webhook matching.';
COMMENT ON COLUMN salespeople.chatwoot_agent_email IS 'Optional cached Chatwoot agent email for diagnostics.';

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS chatwoot_conversation_id INTEGER,
  ADD COLUMN IF NOT EXISTS assignee_sync_source TEXT CHECK (assignee_sync_source IN ('chatwoot', 'crm')),
  ADD COLUMN IF NOT EXISTS assignee_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN leads.chatwoot_conversation_id IS 'Denormalized Chatwoot conversation id for assignment API.';
COMMENT ON COLUMN leads.assignee_sync_source IS 'Last assignee write origin: chatwoot or crm (echo guard).';
COMMENT ON COLUMN leads.assignee_synced_at IS 'Timestamp of last assignee sync.';

CREATE INDEX IF NOT EXISTS idx_leads_chatwoot_conversation_id
  ON leads (chatwoot_conversation_id)
  WHERE chatwoot_conversation_id IS NOT NULL AND is_deleted = false;

-- Backfill conversation id from source_details.external_id (conv_{id}_...)
UPDATE leads
SET chatwoot_conversation_id = (regexp_match(source_details->>'external_id', '^conv_([0-9]+)_'))[1]::INTEGER
WHERE chatwoot_conversation_id IS NULL
  AND source_details->>'external_id' ~ '^conv_[0-9]+_';

UPDATE leads
SET chatwoot_conversation_id = (regexp_match(source_details->>'chatwoot_url', '/conversations/([0-9]+)'))[1]::INTEGER
WHERE chatwoot_conversation_id IS NULL
  AND source_details->>'chatwoot_url' IS NOT NULL;

CREATE OR REPLACE FUNCTION decrement_active_lead_count(agent_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE salespeople
  SET active_lead_count = GREATEST(active_lead_count - 1, 0)
  WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrement_active_lead_count IS 'Decrement denormalized active lead count after reassignment away from agent.';
