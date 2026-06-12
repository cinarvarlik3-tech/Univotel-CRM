/**
 * Tasks list filter toolbar — D27 server-side filters: status, kind, assignee.
 */
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { SalespersonOption } from '@/types/domain';

export interface TaskFilters {
  status: '' | 'open' | 'overdue' | 'completed' | 'cancelled';
  kind: '' | 'auto' | 'manual';
  assigneeId: string;
}

interface TaskListToolbarProps {
  filters: TaskFilters;
  isManager: boolean;
  salespeople: SalespersonOption[] | undefined;
  onChange: (filters: TaskFilters) => void;
}

/**
 * Renders server-side filter controls for the task list (D27).
 */
export function TaskListToolbar({
  filters,
  isManager,
  salespeople,
  onChange,
}: TaskListToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[10px] border border-border-default bg-surface-card px-4 py-3">
      {/* Status filter */}
      <div className="min-w-[160px] space-y-1">
        <Label htmlFor="task-status-filter">Durum</Label>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) =>
            onChange({ ...filters, status: v === 'all' ? '' : (v as TaskFilters['status']) })
          }
        >
          <SelectTrigger id="task-status-filter" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="open">Açık</SelectItem>
            <SelectItem value="overdue">Gecikmiş</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
            <SelectItem value="cancelled">İptal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kind filter: auto vs manual */}
      <div className="min-w-[140px] space-y-1">
        <Label htmlFor="task-kind-filter">Tür</Label>
        <Select
          value={filters.kind || 'all'}
          onValueChange={(v) =>
            onChange({ ...filters, kind: v === 'all' ? '' : (v as TaskFilters['kind']) })
          }
        >
          <SelectTrigger id="task-kind-filter" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="manual">Manuel</SelectItem>
            <SelectItem value="auto">Otomatik</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignee filter (managers only) */}
      {isManager && (
        <div className="min-w-[220px] space-y-1">
          <Label htmlFor="task-assignee-filter">{t('filters.assignee')}</Label>
          <Select
            value={filters.assigneeId || 'all'}
            onValueChange={(v) => onChange({ ...filters, assigneeId: v === 'all' ? '' : v })}
          >
            <SelectTrigger id="task-assignee-filter" className="w-full">
              <SelectValue placeholder={t('filters.allSalespeople')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allSalespeople')}</SelectItem>
              {(salespeople ?? []).map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
