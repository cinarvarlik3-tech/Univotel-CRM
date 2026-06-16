import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/lib/i18n/format-date';
import type { ActivityEvent, ActivityEventKind } from '@/lib/leads/build-activity-timeline';
import { cn } from '@/lib/utils';
import type { SalespersonOption } from '@/types/domain';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Fetch failed');
  return json.data as T;
}

interface ActivityTimelineProps {
  leadId: string;
  salespeople?: SalespersonOption[];
}

const KIND_COLORS: Record<ActivityEventKind, string> = {
  stage_change: 'bg-brand-blue',
  contact: 'bg-emerald-500',
  visit: 'bg-violet-500',
  task_created: 'bg-amber-400',
  task_completed: 'bg-green-500',
};

function resolveActorName(actorId: unknown, salespeople?: SalespersonOption[]): string | null {
  if (typeof actorId !== 'string' || !actorId || !salespeople) return null;
  return salespeople.find((sp) => sp.id === actorId)?.full_name ?? null;
}

function EventRow({
  event,
  kindLabel,
  actorName,
  locale,
}: {
  event: ActivityEvent;
  kindLabel: string;
  actorName: string | null;
  locale: 'tr' | 'en';
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'mt-1 size-2 shrink-0 rounded-full',
            KIND_COLORS[event.kind] ?? 'bg-slate-400',
          )}
        />
        <span className="mt-1 w-px flex-1 bg-border-default" />
      </div>
      <div className="pb-4 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          {kindLabel}
        </p>
        <p className="text-sm text-text-primary break-words">{event.summary}</p>
        {actorName && <p className="mt-0.5 text-xs text-text-secondary">{actorName}</p>}
        <p className="mt-0.5 text-[11px] text-text-tertiary">
          {formatDateTime(event.happenedAt, locale)}
        </p>
      </div>
    </div>
  );
}

export function ActivityTimeline({ leadId, salespeople }: ActivityTimelineProps) {
  const { t, locale } = useTranslation();
  const { data, isLoading, error } = useSWR<ActivityEvent[]>(
    `/api/leads/${leadId}/activity`,
    fetcher,
  );

  const kindLabels: Record<ActivityEventKind, string> = {
    stage_change: t('actions.stageChange'),
    contact: t('actions.contact'),
    visit: t('actions.visit'),
    task_created: t('actions.taskCreated'),
    task_completed: t('actions.taskCompleted'),
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-brand-red">{t('myDay.failedToLoad')}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-text-tertiary">{t('actions.noActivity')}</p>;
  }

  return (
    <div>
      {data.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          kindLabel={kindLabels[event.kind]}
          actorName={resolveActorName(event.meta.actorId, salespeople)}
          locale={locale}
        />
      ))}
    </div>
  );
}
