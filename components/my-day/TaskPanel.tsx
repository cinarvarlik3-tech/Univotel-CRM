/**
 * My Day task panel — Day/Week toggle with overdue/today/upcoming grouping and inline actions.
 */
import { useState, useCallback } from 'react';
import { IconPhone } from '@tabler/icons-react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskCard } from '@/lib/my-day/aggregations';

interface TaskPanelProps {
  tasks: { overdue: TaskCard[]; today: TaskCard[]; upcoming: TaskCard[] };
  onMutate: () => void;
  onOpenLead: (leadUuid: string) => void;
}

type ViewMode = 'day' | 'week';

function getInlineActionLabel(task: TaskCard, t: (key: string) => string): string {
  if (!task.isAutoCreated) return t('myDay.complete');
  switch (task.autoTaskType) {
    case 'nurture_reminder':
    case 'post_visit_nurture_reminder':
      return t('myDay.markContacted');
    case 'visit_resolution':
    case 'visit_reminder':
      return t('myDay.updateVisit');
    case 'failed_visit_followup':
      return t('myDay.logCall');
    default:
      return t('myDay.complete');
  }
}

async function handleInlineAction(task: TaskCard, onMutate: () => void) {
  if (
    !task.isAutoCreated ||
    task.autoTaskType === 'move_in_reminder' ||
    task.autoTaskType === 'visit_reminder'
  ) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: true }),
    });
    onMutate();
    return;
  }

  if (
    task.autoTaskType === 'nurture_reminder' ||
    task.autoTaskType === 'post_visit_nurture_reminder'
  ) {
    await fetch(`/api/leads/${task.leadUuid}/log-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interaction_type: 'call_success' }),
    });
    // Task is auto-completed server-side via completeContactTasks, but also PATCH for safety.
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: true }),
    });
    onMutate();
    return;
  }

  await fetch(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_completed: true }),
  });
  onMutate();
}

interface TaskGroupProps {
  label: string;
  tasks: TaskCard[];
  variant: 'overdue' | 'today' | 'upcoming';
  onMutate: () => void;
  onOpenLead: (leadUuid: string) => void;
}

function TaskGroup({ label, tasks, variant, onMutate, onOpenLead }: TaskGroupProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  if (tasks.length === 0) return null;

  return (
    <div>
      <p
        className={cn(
          'mb-1.5 text-[11px] font-semibold uppercase tracking-wide',
          variant === 'overdue' && 'text-brand-red',
          variant === 'today' && 'text-text-secondary',
          variant === 'upcoming' && 'text-text-tertiary',
        )}
      >
        {label}
        <span className="ml-1.5 font-normal">({tasks.length})</span>
      </p>
      <div className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border border-border-default bg-surface-card px-3 py-2.5"
          >
            {/* Task type + lead info */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {!task.isAutoCreated && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      manual
                    </Badge>
                  )}
                  <p className="truncate text-xs font-medium text-text-primary">
                    {task.autoTaskType ?? task.taskType}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-0.5 block truncate text-left text-[11px] text-text-secondary hover:underline"
                  onClick={() => onOpenLead(task.leadUuid)}
                >
                  {task.leadName ?? '—'}
                  {task.leadFunnelStatus && (
                    <span className="text-text-tertiary"> · {task.leadFunnelStatus}</span>
                  )}
                </button>
                {task.leadPhone && (
                  <a
                    href={`tel:${task.leadPhone}`}
                    className="mt-0.5 flex items-center gap-0.5 text-[11px] text-brand-blue hover:underline"
                  >
                    <IconPhone size={11} />
                    {task.leadPhone}
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={loading === task.id}
                  onClick={async () => {
                    setLoading(task.id);
                    await handleInlineAction(task, onMutate);
                    setLoading(null);
                  }}
                >
                  {loading === task.id ? '…' : getInlineActionLabel(task, t)}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onOpenLead(task.leadUuid)}>
                  {t('common.view')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskPanel({ tasks, onMutate, onOpenLead }: TaskPanelProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>('day');

  const allEmpty =
    tasks.overdue.length === 0 && tasks.today.length === 0 && tasks.upcoming.length === 0;
  const dayEmpty = tasks.overdue.length === 0 && tasks.today.length === 0;

  const handleMutate = useCallback(onMutate, [onMutate]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">{t('myDay.taskPanel')}</p>
        <div className="flex rounded-md border border-border-default text-xs">
          <button
            onClick={() => setView('day')}
            className={cn(
              'rounded-l-md px-3 py-1 transition-colors',
              view === 'day' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:bg-muted',
            )}
          >
            {t('myDay.dayView')}
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              'rounded-r-md px-3 py-1 transition-colors',
              view === 'week' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:bg-muted',
            )}
          >
            {t('myDay.weekView')}
          </button>
        </div>
      </div>

      {(view === 'day' ? dayEmpty : allEmpty) && (
        <p className="py-6 text-center text-sm text-text-tertiary">{t('myDay.noTasks')}</p>
      )}

      <div className="flex flex-col gap-4">
        <TaskGroup
          label={t('myDay.overdue')}
          tasks={tasks.overdue}
          variant="overdue"
          onMutate={handleMutate}
          onOpenLead={onOpenLead}
        />
        <TaskGroup
          label={t('myDay.today')}
          tasks={tasks.today}
          variant="today"
          onMutate={handleMutate}
          onOpenLead={onOpenLead}
        />
        {view === 'week' && (
          <TaskGroup
            label={t('myDay.upcoming')}
            tasks={tasks.upcoming}
            variant="upcoming"
            onMutate={handleMutate}
            onOpenLead={onOpenLead}
          />
        )}
      </div>
    </div>
  );
}
