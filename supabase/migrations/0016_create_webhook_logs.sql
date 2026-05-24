-- Migration 0016: webhook_logs — Phase 2 inbound webhook audit and idempotency.

CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('chatwoot', 'netgsm', 'whatsapp_calls')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'success', 'failed', 'skipped')),
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_source_status ON webhook_logs (source, status);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs (created_at DESC);

COMMENT ON TABLE webhook_logs IS 'Inbound webhook audit log and idempotency (Phase 2).';
