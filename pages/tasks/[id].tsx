/**
 * Task detail page — read-only task view with link to lead.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { KvList } from '@/components/ui/kv-list';
import { Skeleton } from '@/components/ui/skeleton';
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
      <AppShell title="Task">
        <Skeleton className="h-32 w-full max-w-md" />
      </AppShell>
    );
  }

  if (error || !task) {
    return (
      <AppShell title="Task">
        <p className="text-sm text-brand-red">{error || 'Task not found'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Task: ${task.task_type}`}>
      <KvList
        items={[
          { term: 'Due', value: new Date(task.due_when).toLocaleString('tr-TR') },
          { term: 'Completed', value: task.is_completed ? 'Yes' : 'No' },
          { term: 'Late', value: task.is_late ? 'Yes' : 'No' },
          { term: 'Notes', value: task.notes ?? '—' },
          {
            term: 'Lead',
            value: (
              <Link href={`/leads/${task.lead_uuid}`} className="text-brand-blue hover:underline">
                {task.lead_uuid}
              </Link>
            ),
          },
        ]}
      />
      <p className="mt-4">
        <Link href="/tasks" className="text-brand-blue hover:underline">
          Back to tasks
        </Link>
      </p>
    </AppShell>
  );
}
