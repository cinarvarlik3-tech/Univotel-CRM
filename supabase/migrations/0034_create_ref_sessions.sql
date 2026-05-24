-- Migration 0034: Phase 4 — ref_sessions table for REF → UTM lookup (no expiry).

CREATE TABLE ref_sessions (
  ref_code TEXT PRIMARY KEY,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  landing_page TEXT,
  referral_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ref_sessions_created_at_idx ON ref_sessions (created_at DESC);

ALTER TABLE ref_sessions ENABLE ROW LEVEL SECURITY;
