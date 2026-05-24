-- Migration 0036: Phase 4 — collected_data attribution table.

CREATE TABLE collected_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID NOT NULL UNIQUE REFERENCES leads (uuid) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (
    channel IN ('whatsapp', 'instagram', 'netgsm_call', 'whatsapp_call')
  ),
  external_id TEXT NOT NULL,
  ref_code TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  landing_page TEXT,
  referral_domain TEXT,
  session_start TIMESTAMPTZ,
  session_duration INTEGER,
  click_event TEXT,
  ga4_session_id TEXT,
  ad_id TEXT,
  campaign_id TEXT,
  adset_id TEXT,
  placement TEXT,
  called_number TEXT,
  call_duration INTEGER,
  chatwoot_url TEXT,
  is_organic BOOLEAN,
  normalization_failed BOOLEAN NOT NULL DEFAULT false,
  source_confidence TEXT NOT NULL CHECK (
    source_confidence IN ('full', 'lossy', 'inferred', 'unknown')
  ),
  path_lost_at TEXT NOT NULL CHECK (
    path_lost_at IN (
      'full',
      'lost_after_click',
      'lost_at_channel',
      'lost_at_source',
      'lost_at_session',
      'unknown'
    )
  ),
  ga4_enriched BOOLEAN NOT NULL DEFAULT false,
  ga4_enriched_at TIMESTAMPTZ,
  ga4_fetch_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX collected_data_ref_code_idx ON collected_data (ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX collected_data_source_confidence_idx ON collected_data (source_confidence);
CREATE INDEX collected_data_path_lost_at_idx ON collected_data (path_lost_at);
CREATE INDEX collected_data_utm_source_idx ON collected_data (utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX collected_data_called_number_idx ON collected_data (called_number) WHERE called_number IS NOT NULL;
CREATE INDEX collected_data_ga4_pending_idx ON collected_data (created_at)
  WHERE ga4_enriched = false AND ref_code IS NOT NULL;

ALTER TABLE collected_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY collected_data_manager_select ON collected_data
  FOR SELECT USING (is_manager_or_superadmin());
