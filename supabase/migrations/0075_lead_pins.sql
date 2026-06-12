-- Migration 0075: Per-agent lead pins (§1.2 / D1, D7)
-- Personal, private pins float a lead to the top of an agent's own view.

CREATE TABLE IF NOT EXISTS lead_pins (
  agent_id  UUID NOT NULL REFERENCES salespeople(id) ON DELETE CASCADE,
  lead_uuid UUID NOT NULL REFERENCES leads(uuid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, lead_uuid)
);

CREATE INDEX IF NOT EXISTS idx_lead_pins_agent ON lead_pins(agent_id);

-- RLS: each agent reads/writes only their own pins.
ALTER TABLE lead_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_pins_own_agent"
  ON lead_pins
  FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());
