-- Migration 0099: richer webhook_logs outcomes for observability.
--
-- "success" previously meant only "the processor didn't throw" — intentional
-- no-ops, permanent rejects, unactionable drops, and swallowed write failures all
-- looked identical to a real success (and some cases left no row at all). This
-- expands the status vocabulary so every webhook ends with a specific, queryable
-- outcome, plus a machine-readable reason_code. severity and retryable are derived
-- in code from status (no column, avoids drift).
--
-- New statuses:
--   ignored  — intentional no-op by design (e.g. NetGSM non-CDR event, CDR not company line)
--   dropped  — valid payload but couldn't be actioned (e.g. message with no linked lead)
--   partial  — some side effects written, some failed
--   rejected — payload invalid/unauthorized (schema fail, bad token, malformed JSON)
-- Legacy 'skipped' is migrated to 'ignored' but kept in the CHECK set so any
-- pre-deploy code in flight cannot violate the constraint during rollout.

ALTER TABLE webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_status_check;
ALTER TABLE webhook_logs
  ADD CONSTRAINT webhook_logs_status_check
  CHECK (status = ANY (ARRAY[
    'received'::text,
    'processing'::text,
    'success'::text,
    'failed'::text,
    'skipped'::text,
    'ignored'::text,
    'dropped'::text,
    'partial'::text,
    'rejected'::text
  ]));

-- Machine-readable sub-reason, e.g. 'schema_invalid', 'no_linked_lead', 'cdr_written'.
ALTER TABLE webhook_logs
  ADD COLUMN IF NOT EXISTS reason_code TEXT;

-- Migrate the legacy 'skipped' status to 'ignored' (intentional no-op).
UPDATE webhook_logs SET status = 'ignored' WHERE status = 'skipped';
