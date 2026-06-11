-- Migration 0066: Task system columns for Major Update.
--
-- is_auto_created: distinguishes auto-tasks (created by stage transitions) from manual tasks.
--   Stage transition cancellation only affects rows where is_auto_created = true.
--
-- auto_task_type: nullable, identifies the auto-task scenario for UI display and
--   cancellation targeting. Values: nurture_reminder, post_visit_nurture_reminder,
--   visit_reminder, move_in_reminder, visit_resolution, failed_visit_followup.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_auto_created BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_task_type TEXT;

-- Partial index for efficient auto-task cancellation queries.
CREATE INDEX IF NOT EXISTS idx_tasks_auto_lead
  ON tasks(lead_uuid, is_auto_created, is_completed)
  WHERE is_auto_created = true;
