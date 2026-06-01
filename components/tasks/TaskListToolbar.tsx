/**
 * Tasks list filter toolbar — assignee filter for managers only.
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

interface TaskListToolbarProps {
  assigneeId: string;
  salespeople: SalespersonOption[] | undefined;
  onAssigneeChange: (assigneeId: string) => void;
}

/**
 * Renders assignee filter controls for manager task list views.
 * @param props - Current assignee and salespeople options.
 */
export function TaskListToolbar({
  assigneeId,
  salespeople,
  onAssigneeChange,
}: TaskListToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[10px] border border-border-default bg-surface-card px-4 py-3">
      <div className="min-w-[220px] space-y-1">
        <Label htmlFor="task-assignee-filter">{t('filters.assignee')}</Label>
        <Select
          value={assigneeId || 'all'}
          onValueChange={(value) => onAssigneeChange(value === 'all' ? '' : value)}
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
    </div>
  );
}
