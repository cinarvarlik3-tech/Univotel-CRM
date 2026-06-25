import { KpiCard } from '@/components/ui/kpi-card';
import { useTranslation } from '@/hooks/useTranslation';
import { calcTaskKpiCounts } from '@/lib/tasks/task-filters';
import type { TaskRow } from '@/types/domain';

interface TaskTopCardsProps {
  tasks: TaskRow[];
}

export function TaskTopCards({ tasks }: TaskTopCardsProps) {
  const { t } = useTranslation();
  const kpi = calcTaskKpiCounts(tasks);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label={t('tasks.kpiActive')} value={kpi.active} variant="blue" />
      <KpiCard label={t('tasks.kpiOverdue')} value={kpi.overdue} variant="red" />
      <KpiCard label={t('tasks.kpiCompletedOnTime')} value={kpi.completedOnTime} variant="green" />
      <KpiCard
        label={t('tasks.kpiTimelyRate')}
        value={`${kpi.timelyCompletionRate}%`}
        variant="blue"
      />
    </div>
  );
}
