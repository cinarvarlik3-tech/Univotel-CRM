/**
 * My Day header stat tiles — at-a-glance counters with deep-links.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { KpiCard } from '@/components/ui/kpi-card';
import type { MyDayCounters } from '@/lib/my-day/aggregations';

interface CounterStripProps {
  counters: MyDayCounters;
}

export function CounterStrip({ counters }: CounterStripProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      <KpiCard
        label={t('myDay.activeLeads')}
        value={counters.activeLeads}
        href="/leads/mine"
        navigable
      />
      <KpiCard
        label={t('myDay.notContactedToday')}
        value={counters.notContactedToday}
        variant={counters.notContactedToday > 0 ? 'amber' : 'neutral'}
        href="/leads/nurture"
        navigable
      />
      <KpiCard
        label={t('myDay.visitsToday')}
        value={counters.visitsToday}
        sub={`${counters.visitsThisWeek} ${t('myDay.thisWeek').toLowerCase()}`}
        href="/visits"
        navigable
      />
      <KpiCard
        label={t('myDay.tasksDueToday')}
        value={counters.tasksDueToday}
        variant={counters.tasksDueToday > 0 ? 'blue' : 'neutral'}
      />
      <KpiCard
        label={t('myDay.tasksOverdue')}
        value={counters.tasksOverdue}
        variant={counters.tasksOverdue > 0 ? 'red' : 'neutral'}
      />
      <KpiCard
        label={t('myDay.newClaimsThisWeek')}
        value={counters.newClaimsThisWeek}
        href="/leads/mine"
        navigable
      />
    </div>
  );
}
