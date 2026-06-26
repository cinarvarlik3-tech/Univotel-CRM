-- Migration 0103: Drop tasks.is_late column.
--
-- Lateness is now computed at read time (due_when < now()) rather than stored.
-- The task_overdue_check and task-overdue crons that maintained this column
-- were unscheduled in 0102.

ALTER TABLE tasks DROP COLUMN IF EXISTS is_late;
