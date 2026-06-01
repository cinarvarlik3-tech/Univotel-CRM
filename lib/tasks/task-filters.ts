/**
 * Client-side task filtering helpers for list views and KPI counts.
 */
import { formatInTimeZone } from 'date-fns-tz';

import { ISTANBUL_TIMEZONE } from '@/lib/constants';
import type { TaskRow } from '@/types/domain';

/**
 * Returns whether a task due timestamp falls on today's date in Istanbul.
 * @param dueWhen - Task due_when ISO timestamp.
 * @param now - Reference instant; defaults to current time.
 */
export function isTaskDueToday(dueWhen: string, now: Date = new Date()): boolean {
  const dueDate = formatInTimeZone(new Date(dueWhen), ISTANBUL_TIMEZONE, 'yyyy-MM-dd');
  const today = formatInTimeZone(now, ISTANBUL_TIMEZONE, 'yyyy-MM-dd');
  return dueDate === today;
}

/**
 * Counts incomplete tasks due today, optionally scoped to one assignee.
 * @param tasks - Task rows from the tasks API.
 * @param assigneeId - When set, only counts tasks assigned to this salesperson.
 * @param now - Reference instant for "today"; defaults to current time.
 */
export function countTasksDueToday(
  tasks: TaskRow[],
  assigneeId?: string,
  now: Date = new Date(),
): number {
  return tasks.filter(
    (task) =>
      !task.is_completed &&
      isTaskDueToday(task.due_when, now) &&
      (assigneeId == null || task.assigned_to === assigneeId),
  ).length;
}

/**
 * Filters tasks for the tasks list page based on role and optional assignee.
 * @param tasks - Task rows from the tasks API.
 * @param options - Role-aware filter options.
 */
export function filterTasksForListView(
  tasks: TaskRow[],
  options: { isManager: boolean; userId: string; assigneeId?: string },
): TaskRow[] {
  if (!options.isManager) {
    return tasks.filter((task) => task.assigned_to === options.userId);
  }

  if (options.assigneeId) {
    return tasks.filter((task) => task.assigned_to === options.assigneeId);
  }

  return tasks;
}
