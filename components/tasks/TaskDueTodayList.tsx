import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { TaskRowActions } from '@/components/tasks/TaskRowActions';
import { NoteCell } from '@/components/tasks/NoteCell';
import { FilterPopover } from '@/components/tasks/FilterPopover';
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel, formatDateOnly } from '@/lib/i18n';
import { TASK_TYPES } from '@/lib/constants';
import {
  applyTaskListFilters,
  getTaskLeadName,
  isTaskDueToday,
  isTaskDueOnDate,
  EMPTY_TASK_FILTERS,
  type TaskListFilters,
} from '@/lib/tasks/task-filters';
import type { TaskRow } from '@/types/domain';

interface TaskDueTodayListProps {
  tasks: TaskRow[];
  isManager: boolean;
  showAssignee?: boolean;
  salespersonMap?: Map<string, string>;
  /** If set, the panel shows tasks due on this YYYY-MM-DD date instead of today. */
  singleDayOverride?: string;
  onComplete: (taskId: string) => void;
  onRefresh: () => void;
}

export function TaskDueTodayList({
  tasks,
  isManager,
  showAssignee = false,
  salespersonMap,
  singleDayOverride,
  onComplete,
  onRefresh,
}: TaskDueTodayListProps) {
  const { locale, t } = useTranslation();
  const [filters, setFilters] = useState<TaskListFilters>(EMPTY_TASK_FILTERS);

  const todayTasks = singleDayOverride
    ? tasks.filter((task) => isTaskDueOnDate(task.due_when, singleDayOverride))
    : tasks.filter((task) => isTaskDueToday(task.due_when));

  const filtered = applyTaskListFilters(todayTasks, filters);

  function patchFilter(patch: Partial<TaskListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  const panelTitle = singleDayOverride
    ? t('tasks.dueTodaySubtextSingleDay').replace(
        '{date}',
        formatDateOnly(singleDayOverride, locale),
      )
    : t('tasks.sectionDueToday');

  return (
    <div className="flex min-h-[304px] w-full flex-col rounded-2xl border border-border-default bg-surface-card shadow-sm">
      {/* Title bar */}
      <div className="flex items-center justify-between rounded-t-2xl bg-brand-blue px-5 py-3.5">
        <h3 className="text-base font-semibold text-white">{panelTitle}</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ara…"
            value={filters.search}
            onChange={(e) => patchFilter({ search: e.target.value })}
            className="h-7 w-36 border-white/30 bg-white/10 text-xs text-white placeholder:text-white/60 focus-visible:ring-white/40"
          />
          <FilterPopover label={t('common.filters')}>
            <DropdownMenuLabel>{t('tasks.filterType')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filters.taskType}
              onValueChange={(v) => patchFilter({ taskType: v })}
            >
              <DropdownMenuRadioItem value="">{t('tasks.filterAll')}</DropdownMenuRadioItem>
              {TASK_TYPES.map((type) => (
                <DropdownMenuRadioItem key={type} value={type}>
                  {formatEnumLabel(locale, 'task', type)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('tasks.filterStatus')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filters.status}
              onValueChange={(v) => patchFilter({ status: v })}
            >
              <DropdownMenuRadioItem value="">{t('tasks.filterAll')}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="completed">
                {t('tasks.statusCompleted')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="not_completed">
                {t('tasks.statusNotCompleted')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterPopover>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-5 text-sm text-text-tertiary">
          {todayTasks.length === 0 ? t('tasks.noTasksDueToday') : t('tasks.noTasksFound')}
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 z-10 bg-surface-card">
              <tr className="border-b border-border-default">
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('tasks.colLeadName')}
                </th>
                {showAssignee && (
                  <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                    {t('tasks.colAssignee')}
                  </th>
                )}
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('tasks.filterType')}
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('tasks.tableNotes')}
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('tasks.colStatus')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="border-b border-border-default/60 hover:bg-row-hover">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/leads/${task.lead_uuid}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      {getTaskLeadName(task)}
                    </Link>
                  </td>
                  {showAssignee && (
                    <td className="px-4 py-2.5 text-text-secondary">
                      {salespersonMap?.get(task.assigned_to) ?? task.assigned_to.slice(0, 8)}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-text-secondary">
                    {formatEnumLabel(locale, 'task', task.task_type)}
                  </td>
                  <td className="px-4 py-2.5">
                    <NoteCell text={task.notes} taskId={task.id} onRefresh={onRefresh} />
                  </td>
                  <td className="px-4 py-2.5">
                    <TaskRowActions
                      task={task}
                      isManager={isManager}
                      onComplete={onComplete}
                      onRefresh={onRefresh}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
