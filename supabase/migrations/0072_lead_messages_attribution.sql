-- Migration 0072: message direction and sender attribution on lead_messages.
--
-- direction: 'incoming' (from contact) or 'outgoing' (from agent/system).
--            Populated from Chatwoot message_type field in the message_created webhook.
-- sender_agent_id: Chatwoot agent id on agent-sent messages. NULL on incoming messages
--                  and system/campaign sends. Used to attribute outgoing messages to a
--                  salesperson. Campaign template sends have no human sender_agent_id and
--                  must be excluded from personal message-count metrics.
ALTER TABLE lead_messages
  ADD COLUMN IF NOT EXISTS direction TEXT
    CHECK (direction IN ('incoming', 'outgoing'));

ALTER TABLE lead_messages
  ADD COLUMN IF NOT EXISTS sender_agent_id TEXT;
