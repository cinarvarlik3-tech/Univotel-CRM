import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconPlus, IconUsers } from '@tabler/icons-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskTopCards } from '@/components/tasks/TaskTopCards';
import { TaskDueTodayList } from '@/components/tasks/TaskDueTodayList';
import { TaskOverdueList } from '@/components/tasks/TaskOverdueList';
import { TaskAllList } from '@/components/tasks/TaskAllList';
import { TaskCancelledList } from '@/components/tasks/TaskCancelledList';
import { TaskCreateDialog } from '@/components/tasks/TaskCreateDialog';
import { ViewTasksOfPanel } from '@/components/tasks/ViewTasksOfPanel';
import { TimeFilterButton } from '@/components/tasks/TimeFilterButton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useTasks } from '@/hooks/useTasks';
import { useSalespeople } from '@/hooks/useSalespeople';
import {
  filterTasksForListView,
  getDueTodayContext,
  resolveTimeFilterRange,
  EMPTY_TIME_FILTER_STATE,
  type TimeFilterState,
} from '@/lib/tasks/task-filters';
import { isManagerOrAbove } from '@/lib/auth/roles';

export default function TasksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const isManager = isManagerOrAbove(user?.role);

  // ── Separate state: agent selection (managers) + time filter (all) ───
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [timeState, setTimeState] = useState<TimeFilterState>(EMPTY_TIME_FILTER_STATE);
  const [viewPanelOpen, setViewPanelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const isViewingOthers = agentIds.length > 0;
  const showAssignee = agentIds.length > 1;

  const { dueFrom, dueTo } = useMemo(
    () => resolveTimeFilterRange(timeState.timeFilter, timeState.customFrom, timeState.customTo),
    [timeState],
  );

  // ── Main task fetch ─────────────────────────────────────────────────
  const mainFetchOpts = useMemo(
    () => (isViewingOthers ? { assignees: agentIds, dueFrom, dueTo } : { dueFrom, dueTo }),
    [isViewingOthers, agentIds, dueFrom, dueTo],
  );

  const { data: tasks, error: tasksError, isLoading, mutate } = useTasks(mainFetchOpts);

  // ── Cancelled task fetch ────────────────────────────────────────────
  const cancelledFetchOpts = useMemo(
    () =>
      isViewingOthers
        ? { assignees: agentIds, status: 'cancelled' as const }
        : { status: 'cancelled' as const },
    [isViewingOthers, agentIds],
  );

  const { data: cancelledTasks, mutate: mutateCancelled } = useTasks(cancelledFetchOpts);

  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (tasksError) setActionError(t('tasks.failedToLoad'));
    else setActionError('');
  }, [tasksError, t]);

  const reload = useCallback(async () => {
    await Promise.all([mutate(), mutateCancelled()]);
  }, [mutate, mutateCancelled]);

  // Salesperson id -> name map for the assignee column.
  const salespersonMap = useMemo(() => {
    if (!salespeople) return new Map<string, string>();
    return new Map(salespeople.map((sp) => [sp.id, sp.full_name]));
  }, [salespeople]);

  // "Viewing tasks of" badge label.
  const viewingLabel = useMemo(() => {
    if (!isViewingOthers || !salespeople) return null;
    const names = agentIds
      .map((id) => salespeople.find((sp) => sp.id === id)?.full_name ?? id)
      .join(', ');
    return t('tasks.viewingTasksOf').replace('{names}', names);
  }, [isViewingOthers, agentIds, salespeople, t]);

  // While auth is still resolving (slow on cold dev start), render the app
  // shell with a loading state rather than blanking the entire page.
  if (!user) {
    return (
      <AppShell title={t('tasks.title')}>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[90px] w-full rounded-[10px]" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="min-h-[304px] w-full rounded-2xl" />
            <Skeleton className="min-h-[304px] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  async function completeTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: true }),
    });
    if (res.ok) await reload();
  }

  // When viewing own tasks only, filter client-side by userId.
  const myTasks = tasks
    ? isViewingOthers
      ? tasks
      : filterTasksForListView(tasks, { isManager, userId: user.userId })
    : [];

  const myCancelledTasks = cancelledTasks
    ? isViewingOthers
      ? cancelledTasks
      : filterTasksForListView(cancelledTasks, { isManager, userId: user.userId })
    : [];

  // Due Today panel context (adapts title for single-day time filter).
  const dueTodayCtx = getDueTodayContext(
    timeState.timeFilter,
    timeState.customFrom,
    timeState.customTo,
  );

  // ── Header action buttons ────────────────────────────────────────────
  const headerActions = (
    <div className="flex items-center gap-2">
      <TimeFilterButton currentState={timeState} onApply={setTimeState} />
      {isManager && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setViewPanelOpen(true)}
          className="gap-1.5"
        >
          <IconUsers size={14} />
          {t('tasks.viewTasksOf')}
          {isViewingOthers && (
            <span className="ml-1 rounded-full bg-brand-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
              {agentIds.length}
            </span>
          )}
        </Button>
      )}
      <Button type="button" size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
        <IconPlus size={14} />
        {t('tasks.newTask')}
      </Button>
    </div>
  );

  return (
    <AppShell title={t('tasks.title')} actions={headerActions}>
      <div className="flex flex-col gap-5">
        {actionError && <p className="text-sm text-brand-red">{actionError}</p>}

        {/* "Viewing tasks of" context banner */}
        {viewingLabel && (
          <div className="flex items-center justify-between rounded-[10px] border border-brand-blue/30 bg-blue-50 px-4 py-2.5">
            <p className="text-sm font-medium text-brand-blue">{viewingLabel}</p>
            <button
              type="button"
              className="text-xs text-brand-blue hover:underline"
              onClick={() => setAgentIds([])}
            >
              {t('tasks.clearViewFilter')}
            </button>
          </div>
        )}

        {/* KPI top cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[90px] w-full rounded-[10px]" />
            ))}
          </div>
        ) : (
          <TaskTopCards tasks={myTasks} />
        )}

        {/* Two-column lists: Due Today + Overdue */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="min-h-[304px] w-full rounded-2xl" />
            <Skeleton className="min-h-[304px] w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TaskDueTodayList
              tasks={myTasks}
              isManager={isManager}
              showAssignee={showAssignee}
              salespersonMap={salespersonMap}
              singleDayOverride={dueTodayCtx.isSingleDay ? dueTodayCtx.date : undefined}
              onComplete={completeTask}
              onRefresh={reload}
            />
            <TaskOverdueList
              tasks={myTasks}
              isManager={isManager}
              showAssignee={showAssignee}
              salespersonMap={salespersonMap}
              onComplete={completeTask}
              onRefresh={reload}
            />
          </div>
        )}

        {/* Full-width all-tasks list */}
        {isLoading ? (
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        ) : (
          <TaskAllList
            tasks={myTasks}
            isManager={isManager}
            showAssignee={showAssignee}
            salespersonMap={salespersonMap}
            onComplete={completeTask}
            onRefresh={reload}
          />
        )}

        {/* Cancelled tasks list */}
        <TaskCancelledList
          tasks={myCancelledTasks}
          showAssignee={showAssignee}
          salespersonMap={salespersonMap}
        />
      </div>

      {/* Dialogs */}
      <TaskCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={reload} />
      {isManager && (
        <ViewTasksOfPanel
          open={viewPanelOpen}
          onClose={() => setViewPanelOpen(false)}
          currentAgentIds={agentIds}
          onApply={setAgentIds}
        />
      )}
    </AppShell>
  );
}
