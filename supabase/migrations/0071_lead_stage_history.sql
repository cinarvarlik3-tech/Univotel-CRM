-- Migration 0071: lead_stage_history audit table.
--
-- One row per funnel-status transition. Every funnel_status write MUST route through
-- lib/leads/update-lead.ts (or the write-stage-history helper it calls) so this table
-- stays complete. A safety-net trigger (migration 0073) catches any bypassed writes.
--
-- RLS: users read rows where they are the changer OR the lead's current assignee.
--      Managers and superadmins read all rows.
--      Writes are service-client only (no authenticated INSERT policy).

CREATE TABLE IF NOT EXISTS lead_stage_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid   UUID        NOT NULL REFERENCES leads(uuid) ON DELETE CASCADE,
  from_status TEXT,                         -- NULL on the very first recorded transition
  to_status   TEXT        NOT NULL,
  changed_by  UUID        REFERENCES salespeople(id),  -- NULL for system/webhook writes
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  source      TEXT        NOT NULL
              CHECK (source IN ('manual', 'chatwoot', 'netgsm', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_stage_history_lead
  ON lead_stage_history(lead_uuid, changed_at);

CREATE INDEX IF NOT EXISTS idx_stage_history_changed_by
  ON lead_stage_history(changed_by, changed_at);

CREATE INDEX IF NOT EXISTS idx_stage_history_to_status
  ON lead_stage_history(to_status, changed_at);

-- Row-level security.
ALTER TABLE lead_stage_history ENABLE ROW LEVEL SECURITY;

-- Salesperson reads their own transitions, or transitions on leads they own.
-- Managers/superadmins read everything.
DROP POLICY IF EXISTS "stage_history_select" ON lead_stage_history;
CREATE POLICY "stage_history_select" ON lead_stage_history
  FOR SELECT TO authenticated USING (
    changed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM leads
      WHERE leads.uuid = lead_uuid
        AND leads.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM salespeople
      WHERE salespeople.id = auth.uid()
        AND salespeople.role IN ('manager', 'superadmin')
    )
  );
