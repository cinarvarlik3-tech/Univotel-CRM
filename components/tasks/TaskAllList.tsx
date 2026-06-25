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
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel, formatDateOnly } from '@/lib/i18n';
import { TASK_TYPES } from '@/lib/constants';
import {
  applyTaskListFilters,
  getOverdueDays,
  getTaskLeadName,
  EMPTY_TASK_FILTERS,
  type TaskListFilters,
} from '@/lib/tasks/task-filters';
import type { TaskRow } from '@/types/domain';
import { cn } from '@/lib/utils';

interface TaskAllListProps {
  tasks: TaskRow[];
  isManager: boolean;
  showAssignee?: boolean;
  salespersonMap?: Map<string, string>;
  onComplete: (taskId: string) => void;
  onRefresh: () => void;
}

function overdueRowClass(task: TaskRow, days: number): string {
  if (task.is_completed || task.is_cancelled) return '';
  if (days >= 3) return 'bg-red-100';
  if (days >= 2) return 'bg-red-50';
  if (days >= 1) return 'bg-red-50/50';
  return '';
}

export function TaskAllList({
  tasks,
  isManager,
  showAssignee = false,
  salespersonMap,
  onComplete,
  onRefresh,
}: TaskAllListProps) {
  const { locale, t } = useTranslation();
  const [filters, setFilters] = useState<TaskListFilters>(EMPTY_TASK_FILTERS);

  const now = new Date();
  const nonCancelled = tasks.filter((task) => !task.is_cancelled);
  const filtered = applyTaskListFilters(nonCancelled, filters, now);

  function patchFilter(patch: Partial<TaskListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="flex w-full flex-col rounded-2xl border border-border-default bg-surface-card shadow-sm">
      {/* Title bar */}
      <div className="flex items-center justify-between rounded-t-2xl bg-brand-blue px-5 py-3.5">
        <h3 className="text-base font-semibold text-white">{t('tasks.sectionAll')}</h3>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="flex flex-col items-start gap-1 focus:bg-transparent"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                {t('tasks.filterDueDate')}
              </span>
              <input
                type="date"
                value={filters.dueDate}
                onChange={(e) => patchFilter({ dueDate: e.target.value })}
                className="h-8 w-full rounded-md border border-border-default bg-surface-card px-2 text-xs text-text-primary"
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="flex flex-col items-start gap-1 focus:bg-transparent"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                {t('tasks.filterOverdueBy')}
              </span>
              <input
                type="number"
                min="1"
                placeholder="e.g. 3"
                value={filters.overdueBy}
                onChange={(e) => patchFilter({ overdueBy: e.target.value })}
                className="h-8 w-full rounded-md border border-border-default bg-surface-card px-2 text-xs text-text-primary"
              />
            </DropdownMenuItem>
          </FilterPopover>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="flex items-center justify-center px-5 py-16 text-sm text-text-tertiary">
          {t('tasks.noTasksFound')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
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
                  {t('tasks.colDueDate')}
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('tasks.colOverdueBy')}
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {t('tasks.colStatus')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const days = getOverdueDays(task, now);
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      'border-b border-border-default/60 hover:bg-row-hover',
                      overdueRowClass(task, days),
                    )}
                  >
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
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                      {formatDateOnly(task.due_when, locale)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {days > 0 ? (
                        <span
                          className={cn(
                            'text-sm',
                            !task.is_completed && days >= 3 && 'font-semibold text-red-700',
                            !task.is_completed &&
                              days >= 2 &&
                              days < 3 &&
                              'font-medium text-red-600',
                            !task.is_completed && days >= 1 && days < 2 && 'text-red-500',
                            task.is_completed && 'text-text-tertiary',
                          )}
                        >
                          {t('tasks.overdueByDays').replace('{n}', String(days))}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
