-- Migration 0081: Backfill direction + sender_agent_id on lead_messages rows
-- synced via Conversation tab before attribution fields were populated on upsert.
--
-- direction: copied from message_type (incoming/outgoing).
-- sender_agent_id: Chatwoot agent id as text for human outgoing sends only.

UPDATE lead_messages
SET direction = message_type
WHERE direction IS NULL
  AND message_type IN ('incoming', 'outgoing');

UPDATE lead_messages
SET sender_agent_id = sender_id::TEXT
WHERE sender_agent_id IS NULL
  AND message_type = 'outgoing'
  AND sender_type = 'user'
  AND sender_id IS NOT NULL;
