-- Queue table for new-message coalescing path.
-- Rows are written by the webhook isolate (fast path) and flushed by the
-- lead-message-notify cron every 60s. Service-role only — no RLS needed.

CREATE TABLE pending_notifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID        NOT NULL REFERENCES leads(uuid) ON DELETE CASCADE,
  lead_name         TEXT        NOT NULL,
  conversation_id   BIGINT,
  message_snippet   TEXT        NOT NULL,
  is_unclaimed      BOOLEAN     NOT NULL DEFAULT false,
  recipient_chat_ids TEXT[]     NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  flushed_at        TIMESTAMPTZ
);

CREATE INDEX idx_pending_notifications_unflushed
  ON pending_notifications (created_at)
  WHERE flushed_at IS NULL;
