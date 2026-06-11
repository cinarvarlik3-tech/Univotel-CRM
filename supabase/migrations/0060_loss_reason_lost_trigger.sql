-- Migration 0060: Allow loss_reason on 'lost' funnel status (Kayıp).
-- Migration 0015 tied loss_reason to 'ziyaret-ama-almayacak' only, which cleared
-- loss_reason whenever funnel_status was 'lost'. Restore dual-status support:
--   ziyaret-ama-almayacak → loss_reason required
--   lost                  → loss_reason optional (label-only Kayıp is valid)
--   other statuses        → loss_reason must be null

CREATE OR REPLACE FUNCTION enforce_loss_reason_on_lost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.funnel_status = 'ziyaret-ama-almayacak' AND NEW.loss_reason IS NULL THEN
    RAISE EXCEPTION 'loss_reason is required when funnel_status is ziyaret-ama-almayacak';
  END IF;

  IF NEW.funnel_status NOT IN ('ziyaret-ama-almayacak', 'lost')
     AND NEW.loss_reason IS NOT NULL THEN
    NEW.loss_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
