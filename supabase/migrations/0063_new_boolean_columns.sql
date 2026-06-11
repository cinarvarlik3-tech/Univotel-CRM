-- Migration 0063: New boolean flag columns on leads for Major Update.
--
-- has_moved_in     — true when lead has physically moved in (sozlesme-imzalandi only).
--                   Triggers lead to be hidden from default views.
-- is_24h_restricted — true when Chatwoot 24h_window_warning label is applied.
--                   Clearable by superadmin only. Preserves current funnel_status.
-- move_in_date_set — true when lead_details.move_in date is confirmed AND funnel
--                   status is kapora-alindi or sozlesme-imzalandi.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS has_moved_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_24h_restricted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS move_in_date_set BOOLEAN NOT NULL DEFAULT false;

-- Partial indexes — most leads are false, only index the true minority.
CREATE INDEX IF NOT EXISTS leads_has_moved_in_idx
  ON leads(has_moved_in) WHERE has_moved_in = true;

CREATE INDEX IF NOT EXISTS leads_is_24h_restricted_idx
  ON leads(is_24h_restricted) WHERE is_24h_restricted = true;

CREATE INDEX IF NOT EXISTS leads_move_in_date_set_idx
  ON leads(move_in_date_set) WHERE move_in_date_set = true;
