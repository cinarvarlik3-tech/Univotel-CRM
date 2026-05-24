-- Migration 0039: Idempotent old_leads import via unique Chatwoot conversation id.

CREATE UNIQUE INDEX IF NOT EXISTS idx_old_leads_chatwoot_conv_unique
  ON old_leads (chatwoot_conversation_id)
  WHERE chatwoot_conversation_id IS NOT NULL;
