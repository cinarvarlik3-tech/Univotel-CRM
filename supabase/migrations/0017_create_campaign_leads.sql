-- Migration 0017: Minimal campaigns + campaign_leads for Meta delivery/read status webhooks.
-- Full campaign worker UI comes later; statuses handler needs wa_message_id lookup.

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type TEXT NOT NULL DEFAULT 'outbound_message'
    CHECK (campaign_type IN ('outbound_message', 'outbound_call')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  segment JSONB NOT NULL DEFAULT '{}'::jsonb,
  language TEXT,
  template_id TEXT,
  template_language TEXT,
  template_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  daily_send_count INTEGER NOT NULL DEFAULT 0,
  paused_at TIMESTAMPTZ,
  created_by UUID REFERENCES salespeople (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  lead_uuid UUID NOT NULL REFERENCES leads (uuid) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  skipped_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  wa_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, lead_uuid)
);

CREATE UNIQUE INDEX idx_campaign_leads_wa_message_id
  ON campaign_leads (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

CREATE INDEX idx_campaign_leads_campaign_status ON campaign_leads (campaign_id, status);

COMMENT ON TABLE campaigns IS 'WhatsApp bulk campaigns (Phase 2).';
COMMENT ON TABLE campaign_leads IS 'Per-lead campaign send state; updated by Meta statuses webhooks.';
