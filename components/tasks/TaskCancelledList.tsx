import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { FilterPopover } from '@/components/tasks/FilterPopover';
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n';
import { TASK_TYPES } from '@/lib/constants';
import { getTaskLeadName } from '@/lib/tasks/task-filters';
import { NoteCell } from '@/components/tasks/NoteCell';
import type { TaskRow } from '@/types/domain';

interface TaskCancelledListProps {
  tasks: TaskRow[];
  showAssignee?: boolean;
  salespersonMap?: Map<string, string>;
}

interface CancelledFilters {
  search: string;
  taskType: string;
}

export function TaskCancelledList({
  tasks,
  showAssignee = false,
  salespersonMap,
}: TaskCancelledListProps) {
  const { locale, t } = useTranslation();
  const [filters, setFilters] = useState<CancelledFilters>({ search: '', taskType: '' });

  function patchFilter(patch: Partial<CancelledFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  let filtered = tasks;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((t) => {
      const name = getTaskLeadName(t).toLowerCase();
      const note = (t.notes ?? '').toLowerCase();
      const reason = (t.cancel_reason ?? '').toLowerCase();
      return name.includes(q) || note.includes(q) || reason.includes(q);
    });
  }
  if (filters.taskType) {
    filtered = filtered.filter((t) => t.task_type === filters.taskType);
  }

  return (
    <div className="flex w-full flex-col rounded-2xl border border-border-default bg-surface-card shadow-sm">
      {/* Title bar — neutral grey */}
      <div className="flex items-center justify-between rounded-t-2xl bg-surface-secondary px-5 py-3.5">
        <h3 className="text-base font-semibold text-text-primary">{t('tasks.sectionCancelled')}</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ara…"
            value={filters.search}
            onChange={(e) => patchFilter({ search: e.target.value })}
            className="h-7 w-36 text-xs"
          />
          <FilterPopover label={t('common.filters')} variant="dark">
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
          </FilterPopover>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="flex items-center justify-center px-5 py-16 text-sm text-text-tertiary">
          {t('tasks.noCancelledTasks')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
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
                  {t('tasks.colCancelReason')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-border-default/60 opacity-75 hover:bg-row-hover hover:opacity-100"
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
                    <NoteCell text={task.notes} />
                  </td>
                  <td className="px-4 py-2.5">
                    <NoteCell text={task.cancel_reason} label="İptal Nedeni" />
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
