-- Migration 0076: Recent searches per agent (§1.3 / D14)
-- Stores recently searched/opened leads for quick-reopen during mid-call flows.
-- Cap to last 10 per agent; prune on write via a trigger.

CREATE TABLE IF NOT EXISTS recent_searches (
  agent_id    UUID NOT NULL REFERENCES salespeople(id) ON DELETE CASCADE,
  lead_uuid   UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, lead_uuid)
);

CREATE INDEX IF NOT EXISTS idx_recent_searches_agent
  ON recent_searches(agent_id, searched_at DESC);

-- RLS: each agent reads/writes only their own recent searches.
ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recent_searches_own_agent"
  ON recent_searches
  FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Trigger: prune entries beyond the most-recent 10 per agent after each insert.
CREATE OR REPLACE FUNCTION prune_recent_searches()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM recent_searches
  WHERE agent_id = NEW.agent_id
    AND lead_uuid NOT IN (
      SELECT lead_uuid
      FROM recent_searches
      WHERE agent_id = NEW.agent_id
      ORDER BY searched_at DESC
      LIMIT 10
    );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_prune_recent_searches
  AFTER INSERT ON recent_searches
  FOR EACH ROW EXECUTE FUNCTION prune_recent_searches();
