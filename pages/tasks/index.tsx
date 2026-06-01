/**
 * Tasks list page — create tasks and mark complete.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import { AppShell } from '@/components/layout/AppShell';
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm';
import { TaskListToolbar } from '@/components/tasks/TaskListToolbar';
import { TaskTable } from '@/components/tasks/TaskTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTasks } from '@/hooks/useTasks';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { filterTasksForListView } from '@/lib/tasks/task-filters';

/**
 * Reads assignee filter from router query for manager task views.
 * @param query - Next.js router query object.
 */
function assigneeFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | undefined {
  const assignee = query.assignee;
  if (typeof assignee === 'string' && assignee.length > 0) {
    return assignee;
  }
  return undefined;
}

/**
 * Renders task list with creation form.
 * @returns Tasks page wrapped in AppShell.
 */
export default function TasksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();
  const { data: tasks, error: tasksError, isLoading, mutate } = useTasks();
  const [actionError, setActionError] = useState('');

  const isManager = isManagerOrAbove(user?.role);
  const assigneeFilter = router.isReady && isManager ? assigneeFromQuery(router.query) : undefined;

  const visibleTasks = useMemo(() => {
    if (!user || !tasks) return [];

    return filterTasksForListView(tasks, {
      isManager,
      userId: user.userId,
      assigneeId: assigneeFilter,
    });
  }, [tasks, user, isManager, assigneeFilter]);

  const loadTasks = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    if (tasksError) {
      setActionError(t('tasks.failedToLoad'));
    } else {
      setActionError('');
    }
  }, [tasksError, t]);

  const handleAssigneeChange = useCallback(
    (nextAssigneeId: string) => {
      const nextQuery = { ...router.query };
      if (nextAssigneeId) {
        nextQuery.assignee = nextAssigneeId;
      } else {
        delete nextQuery.assignee;
      }

      void router.push({ pathname: '/tasks', query: nextQuery }, undefined, { shallow: true });
    },
    [router],
  );

  async function completeTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: true }),
    });

    if (res.ok) {
      await loadTasks();
    }
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell title={t('tasks.title')}>
      {actionError && <p className="mb-4 text-sm text-brand-red">{actionError}</p>}

      {isManager && (
        <TaskListToolbar
          assigneeId={assigneeFilter ?? ''}
          salespeople={salespeople}
          onAssigneeChange={handleAssigneeChange}
        />
      )}

      <TaskCreateForm onCreated={loadTasks} />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[58px] w-full" />
          <Skeleton className="h-[58px] w-full" />
        </div>
      ) : (
        <TaskTable tasks={visibleTasks} onComplete={completeTask} onNotesUpdated={loadTasks} />
      )}
    </AppShell>
  );
}
