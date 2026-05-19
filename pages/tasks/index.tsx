/**
 * Tasks list page — create tasks and mark complete.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm';
import { TaskTable } from '@/components/tasks/TaskTable';
import type { TaskRow } from '@/types/domain';

/**
 * Renders task list with creation form.
 * @returns Tasks page wrapped in AppShell.
 */
export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    const json = await res.json();
    if (res.ok) {
      setTasks(json.data);
      setError('');
    } else {
      setError(json.error ?? 'Failed to load tasks');
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function completeTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: true }),
    });

    if (res.ok) {
      loadTasks();
    }
  }

  return (
    <AppShell>
      <h1>Tasks</h1>
      {error && <p className="error">{error}</p>}

      <TaskCreateForm onCreated={loadTasks} />
      <TaskTable tasks={tasks} onComplete={completeTask} onNotesUpdated={loadTasks} />
    </AppShell>
  );
}
