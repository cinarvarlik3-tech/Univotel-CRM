/**
 * Task detail page — read-only task view with link to lead.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { KvList } from '@/components/ui/kv-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, formatEnumLabel, formatYesNo } from '@/lib/i18n';
import type { TaskRow } from '@/types/domain';

/**
 * Renders a single task detail view.
 * @returns Task detail page wrapped in AppShell.
 */
export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale, t } = useTranslation();
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
          setError(json.error ?? t('tasks.notFound'));
        }
      });
  }, [id, t]);

  if (!task && !error) {
    return (
      <AppShell title={t('tasks.task')}>
        <Skeleton className="h-32 w-full max-w-md" />
      </AppShell>
    );
  }

  if (error || !task) {
    return (
      <AppShell title={t('tasks.task')}>
        <p className="text-sm text-brand-red">{error || t('tasks.notFound')}</p>
      </AppShell>
    );
  }

  const emDash = t('common.emDash');

  return (
    <AppShell
      title={t('tasks.taskTitle', { type: formatEnumLabel(locale, 'task', task.task_type) })}
    >
      <KvList
        items={[
          { term: t('tasks.due'), value: formatDateTime(task.due_when, locale) },
          { term: t('tasks.completed'), value: formatYesNo(task.is_completed, locale) },
          {
            term: t('tasks.late'),
            value: formatYesNo(
              task.is_completed
                ? task.completed_at != null && new Date(task.completed_at) > new Date(task.due_when)
                : new Date(task.due_when) < new Date(),
              locale,
            ),
          },
          { term: t('tasks.notes'), value: task.notes ?? emDash },
          {
            term: t('tasks.lead'),
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
          {t('tasks.backToTasks')}
        </Link>
      </p>
    </AppShell>
  );
}
