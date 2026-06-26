/**
 * Stub — task_overdue_check and task-overdue crons were unscheduled in migration 0102.
 * tasks.is_late column was dropped in migration 0103.
 */
export async function runTaskOverdueAlerts(): Promise<number> {
  return 0;
}
