-- Migration 0068: Track last inbound (customer) message time on leads for the
-- cron-driven 24h restriction.
--
-- The WhatsApp 24h customer-service window is measured from the customer's last
-- INCOMING message. We denormalize that timestamp onto leads so the restriction
-- cron is a single bulk indexed UPDATE instead of a scan of lead_messages.
--
-- Maintained in application code (lib/webhooks/process-chatwoot.ts) on each
-- incoming message — not a DB trigger, matching project convention.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS last_inbound_message_at TIMESTAMPTZ;

COMMENT ON COLUMN leads.last_inbound_message_at IS
  'Timestamp of the most recent incoming (customer) Chatwoot message. Drives the 24h restriction cron.';

-- Partial index: the cron only scans not-yet-restricted leads.
CREATE INDEX IF NOT EXISTS leads_last_inbound_message_at_idx
  ON leads(last_inbound_message_at)
  WHERE is_24h_restricted = false;

-- One-time backfill from lead_messages: latest incoming message per lead.
UPDATE leads l
SET last_inbound_message_at = m.max_created
FROM (
  SELECT lead_uuid, MAX(created_at) AS max_created
  FROM lead_messages
  WHERE message_type = 'incoming'
  GROUP BY lead_uuid
) m
WHERE l.uuid = m.lead_uuid
  AND l.last_inbound_message_at IS NULL;
