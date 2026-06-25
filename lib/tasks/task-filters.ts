/**
 * Client-side task filtering helpers for list views and KPI counts.
 */
import { formatInTimeZone } from 'date-fns-tz';

import { ISTANBUL_TIMEZONE } from '@/lib/constants';
import type { TaskRow } from '@/types/domain';

export type TimeFilterOption = 'current' | 'today' | 'week' | 'month' | 'custom';

export interface TimeFilterState {
  timeFilter: TimeFilterOption;
  customFrom: string;
  customTo: string;
}

export const EMPTY_TIME_FILTER_STATE: TimeFilterState = {
  timeFilter: 'current',
  customFrom: '',
  customTo: '',
};

export interface ViewTasksOfState {
  /** Empty = own tasks only. */
  agentIds: string[];
  timeFilter: TimeFilterOption;
  customFrom: string;
  customTo: string;
}

export const EMPTY_VIEW_STATE: ViewTasksOfState = {
  agentIds: [],
  timeFilter: 'current',
  customFrom: '',
  customTo: '',
};

/**
 * Returns due_from / due_to ISO strings for a given time filter option.
 * `customFrom`/`customTo` are YYYY-MM-DD strings from the custom date picker.
 */
export function resolveTimeFilterRange(
  filter: TimeFilterOption,
  customFrom: string,
  customTo: string,
  now: Date = new Date(),
): { dueFrom?: string; dueTo?: string } {
  if (filter === 'current') return {};

  if (filter === 'today') {
    const dayStr = formatInTimeZone(now, ISTANBUL_TIMEZONE, 'yyyy-MM-dd');
    return {
      dueFrom: `${dayStr}T00:00:00.000Z`,
      dueTo: `${dayStr}T23:59:59.999Z`,
    };
  }

  if (filter === 'week') {
    const d = new Date(now);
    const day = d.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMon);
    const monday = formatInTimeZone(d, ISTANBUL_TIMEZONE, 'yyyy-MM-dd');
    d.setDate(d.getDate() + 6);
    const sunday = formatInTimeZone(d, ISTANBUL_TIMEZONE, 'yyyy-MM-dd');
    return { dueFrom: `${monday}T00:00:00.000Z`, dueTo: `${sunday}T23:59:59.999Z` };
  }

  if (filter === 'month') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return {
      dueFrom: `${y}-${m}-01T00:00:00.000Z`,
      dueTo: `${y}-${m}-${lastDay}T23:59:59.999Z`,
    };
  }

  if (filter === 'custom') {
    const result: { dueFrom?: string; dueTo?: string } = {};
    if (customFrom) result.dueFrom = `${customFrom}T00:00:00.000Z`;
    if (customTo) result.dueTo = `${customTo}T23:59:59.999Z`;
    else if (customFrom) result.dueTo = `${customFrom}T23:59:59.999Z`;
    return result;
  }

  return {};
}

/**
 * When a time filter is active, returns the "due today" panel date context.
 * Returns `undefined` when "current" (use system today).
 * Returns a YYYY-MM-DD string for single-day custom, or undefined for ranges.
 */
export function getDueTodayContext(
  filter: TimeFilterOption,
  customFrom: string,
  customTo: string,
): { isSingleDay: boolean; date?: string } {
  if (filter === 'current' || filter === 'today') {
    return { isSingleDay: false };
  }
  if (filter === 'custom' && customFrom && (!customTo || customTo === customFrom)) {
    return { isSingleDay: true, date: customFrom };
  }
  return { isSingleDay: false };
}

/**
 * Returns true when a task's due_when falls on the given YYYY-MM-DD date (Istanbul).
 */
export function isTaskDueOnDate(dueWhen: string, date: string): boolean {
  const dueDate = formatInTimeZone(new Date(dueWhen), ISTANBUL_TIMEZONE, 'yyyy-MM-dd');
  return dueDate === date;
}

/** Returns the best display name for the lead joined on a task row. */
export function getTaskLeadName(task: TaskRow): string {
  const l = task.leads;
  if (!l) return task.lead_uuid.slice(0, 8) + '…';
  return l.display_name || l.lead_name || l.lead_phone;
}

/**
 * How many days a task is overdue.
 * Counts to `completed_at` when done; counts to `now` while still open.
 * Returns 0 for tasks that are not yet due.
 */
export function getOverdueDays(task: TaskRow, now: Date = new Date()): number {
  const due = new Date(task.due_when);
  const compareDate = task.is_completed && task.completed_at ? new Date(task.completed_at) : now;
  const diffMs = compareDate.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/** Returns true for tasks that are overdue (due in the past and not completed). */
export function isTaskOverdue(task: TaskRow, now: Date = new Date()): boolean {
  return !task.is_completed && !task.is_cancelled && new Date(task.due_when) < now;
}

/** Returns true for tasks completed on time (completed_at <= due_when). */
export function isCompletedOnTime(task: TaskRow): boolean {
  if (!task.is_completed || !task.completed_at) return false;
  return new Date(task.completed_at) <= new Date(task.due_when);
}

/** KPI counts for the tasks top-cards section. */
export interface TaskKpiCounts {
  active: number;
  overdue: number;
  completedOnTime: number;
  timelyCompletionRate: number;
}

export function calcTaskKpiCounts(tasks: TaskRow[], now: Date = new Date()): TaskKpiCounts {
  const active = tasks.filter(
    (t) => !t.is_completed && !t.is_cancelled && new Date(t.due_when) >= now,
  ).length;
  const overdue = tasks.filter((t) => isTaskOverdue(t, now)).length;
  const allCompleted = tasks.filter((t) => t.is_completed);
  const completedOnTime = allCompleted.filter(isCompletedOnTime).length;
  const timelyCompletionRate =
    allCompleted.length > 0 ? Math.round((completedOnTime / allCompleted.length) * 100) : 0;
  return { active, overdue, completedOnTime, timelyCompletionRate };
}

/** Shared filter shape for the dual lists and all-tasks list. */
export interface TaskListFilters {
  search: string;
  taskType: string;
  status: string;
  dueDate: string;
  overdueBy: string;
}

export const EMPTY_TASK_FILTERS: TaskListFilters = {
  search: '',
  taskType: '',
  status: '',
  dueDate: '',
  overdueBy: '',
};

/**
 * Applies client-side filters to a task array.
 * `dueDate` and `overdueBy` filters are opt-in (ignored when empty).
 */
export function applyTaskListFilters(
  tasks: TaskRow[],
  filters: TaskListFilters,
  now: Date = new Date(),
): TaskRow[] {
  let result = tasks;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((t) => {
      const name = getTaskLeadName(t).toLowerCase();
      const note = (t.notes ?? '').toLowerCase();
      return name.includes(q) || note.includes(q);
    });
  }

  if (filters.taskType) {
    result = result.filter((t) => t.task_type === filters.taskType);
  }

  if (filters.status === 'completed') {
    result = result.filter((t) => t.is_completed);
  } else if (filters.status === 'not_completed') {
    result = result.filter((t) => !t.is_completed);
  }

  if (filters.dueDate) {
    const cutoff = new Date(filters.dueDate);
    cutoff.setHours(23, 59, 59, 999);
    result = result.filter((t) => new Date(t.due_when) <= cutoff);
  }

  if (filters.overdueBy) {
    const minDays = parseInt(filters.overdueBy, 10);
    if (!isNaN(minDays) && minDays > 0) {
      result = result.filter((t) => getOverdueDays(t, now) >= minDays);
    }
  }

  return result;
}

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
