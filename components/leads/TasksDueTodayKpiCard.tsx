/**
 * KPI card showing incomplete tasks due today with link to the tasks list.
 */
import { useMemo } from 'react';

import { KpiCard } from '@/components/ui/kpi-card';
import { useTasks } from '@/hooks/useTasks';
import { useTranslation } from '@/hooks/useTranslation';
import { countTasksDueToday } from '@/lib/tasks/task-filters';

interface TasksDueTodayKpiCardProps {
  /** When true, counts only tasks assigned to assigneeId. */
  mine?: boolean;
  /** Current salesperson UUID for the My Leads view. */
  assigneeId?: string;
}

/**
 * Renders a navigable Tasks Due Today KPI card for manager or salesperson lead lists.
 * @param props - Scope flags for count and navigation target.
 */
export function TasksDueTodayKpiCard({ mine = false, assigneeId }: TasksDueTodayKpiCardProps) {
  const { t } = useTranslation();
  const { data: tasks, isLoading } = useTasks();

  const count = useMemo(
    () => countTasksDueToday(tasks ?? [], mine ? assigneeId : undefined),
    [tasks, mine, assigneeId],
  );

  const href = mine && assigneeId ? `/tasks?assignee=${encodeURIComponent(assigneeId)}` : '/tasks';

  return (
    <KpiCard
      label={t('leads.tasksDueToday')}
      value={isLoading ? t('common.emDash') : count}
      sub={mine ? t('leads.yourTasks') : t('leads.allSalespeople')}
      variant={count > 0 ? 'amber' : 'neutral'}
      href={href}
      navigable
    />
  );
}
