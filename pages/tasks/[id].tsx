/**
 * Task detail page — read-only task view with link to lead.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import type { TaskRow } from '@/types/domain';

/**
 * Renders a single task detail view.
 * @returns Task detail page wrapped in AppShell.
 */
export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState<TaskRow | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof id !== 'string') return;

    fetch(`/api/tasks/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setTask(json.data);
        } else {
          setError(json.error ?? 'Task not found');
        }
      });
  }, [id]);

  if (!task && !error) {
    return (
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  if (error || !task) {
    return (
      <AppShell>
        <p className="error">{error || 'Task not found'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1>Task: {task.task_type}</h1>
      <dl className="kv">
        <dt>Due</dt>
        <dd>{new Date(task.due_when).toLocaleString('tr-TR')}</dd>
        <dt>Completed</dt>
        <dd>{task.is_completed ? 'Yes' : 'No'}</dd>
        <dt>Late</dt>
        <dd>{task.is_late ? 'Yes' : 'No'}</dd>
        <dt>Notes</dt>
        <dd>{task.notes ?? '—'}</dd>
        <dt>Lead</dt>
        <dd>
          <Link href={`/leads/${task.lead_uuid}`}>{task.lead_uuid}</Link>
        </dd>
      </dl>
      <p>
        <Link href="/tasks">Back to tasks</Link>
      </p>
    </AppShell>
  );
}
