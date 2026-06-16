-- Migration 0092: add tasks.is_cancelled.
--
-- The tasks list API (GET /api/tasks) and the toolbar "İptal" (cancelled) filter
-- both query tasks.is_cancelled, but the column was never created — every request
-- to /api/tasks 500'd ("column tasks.is_cancelled does not exist"). Auto-tasks are
-- closed via is_completed; is_cancelled marks tasks explicitly cancelled (e.g. a
-- future manual cancel action). Defaults false so existing rows are unaffected.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false;
