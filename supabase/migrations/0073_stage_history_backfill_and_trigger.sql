-- Migration 0073: seed lead_stage_history from current lead state + safety-net trigger.
--
-- BACKFILL: Give every existing lead one baseline history row so timelines are not empty.
-- This does not reconstruct past transitions (that data is gone); it establishes a
-- starting point so all go-forward tracking is anchored.
INSERT INTO lead_stage_history (lead_uuid, from_status, to_status, changed_by, changed_at, source)
SELECT
  uuid,
  NULL,                          -- no known prior state
  funnel_status,
  NULL,                          -- system origin
  COALESCE(updated_at, created_at, now()),
  'system'
FROM leads
WHERE is_deleted = false
ON CONFLICT DO NOTHING;

-- SAFETY-NET TRIGGER: if a funnel_status UPDATE arrives without the application layer
-- having already inserted a history row in the same transaction, this trigger inserts
-- one with source='system'. It is a last-resort guard — the application layer is the
-- authoritative writer; this trigger just makes silent bypasses visible in the audit log.
CREATE OR REPLACE FUNCTION fn_lead_stage_history_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when funnel_status actually changed.
  IF NEW.funnel_status IS DISTINCT FROM OLD.funnel_status THEN
    -- Check if the application already wrote a history row for this transition
    -- within this transaction (same clock instant, sub-millisecond window).
    IF NOT EXISTS (
      SELECT 1 FROM lead_stage_history
      WHERE lead_uuid  = NEW.uuid
        AND to_status  = NEW.funnel_status
        AND changed_at >= (now() - INTERVAL '1 second')
    ) THEN
      INSERT INTO lead_stage_history (lead_uuid, from_status, to_status, changed_by, changed_at, source)
      VALUES (NEW.uuid, OLD.funnel_status, NEW.funnel_status, NULL, now(), 'system');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_stage_history_guard ON leads;
CREATE TRIGGER trg_lead_stage_history_guard
  AFTER UPDATE OF funnel_status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION fn_lead_stage_history_guard();
