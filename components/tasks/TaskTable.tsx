/**
 * Task list table with inline notes editing.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, formatEnumLabel, formatYesNo } from '@/lib/i18n';
import type { TaskRow } from '@/types/domain';

interface TaskTableProps {
  tasks: TaskRow[];
  onComplete: (taskId: string) => void;
  onNotesUpdated: () => void;
}

/**
 * Truncates long notes for table display.
 * @param notes - Task notes or null.
 * @returns Truncated string.
 */
function truncateNotes(notes: string | null, emDash: string): string {
  if (!notes) return emDash;
  return notes.length > 60 ? `${notes.slice(0, 60)}…` : notes;
}

/**
 * Renders tasks table with completion and notes edit.
 * @param props - Tasks array and handlers.
 * @returns Tasks table element.
 */
export function TaskTable({ tasks, onComplete, onNotesUpdated }: TaskTableProps) {
  const { locale, t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const emDash = t('common.emDash');

  async function saveNotes(taskId: string) {
    setSaving(true);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: editNotes }),
    });
    setSaving(false);

    if (res.ok) {
      setEditingId(null);
      onNotesUpdated();
    }
  }

  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">{t('tasks.noTasksFound')}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>{t('tasks.tableType')}</TableHead>
            <TableHead>{t('tasks.tableDue')}</TableHead>
            <TableHead>{t('tasks.tableLate')}</TableHead>
            <TableHead>{t('tasks.tableNotes')}</TableHead>
            <TableHead>{t('tasks.lead')}</TableHead>
            <TableHead>{t('tasks.tableAction')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className={task.is_completed ? 'opacity-60' : undefined}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span>{formatEnumLabel(locale, 'task', task.task_type)}</span>
                  {/* D27 §7.3: auto-task marker */}
                  {task.is_auto_created && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-text-tertiary">
                      <span className="rounded bg-surface-secondary px-1 py-0.5 font-mono">
                        otomatik
                      </span>
                      {task.auto_task_type && (
                        <span className="opacity-70">{task.auto_task_type}</span>
                      )}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatDateTime(task.due_when, locale)}
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatYesNo(task.is_late, locale)}
              </TableCell>
              <TableCell>
                {editingId === task.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => saveNotes(task.id)} disabled={saving}>
                        {t('common.save')}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-left"
                    onClick={() => {
                      setEditingId(task.id);
                      setEditNotes(task.notes ?? '');
                    }}
                  >
                    {truncateNotes(task.notes, emDash)}
                  </Button>
                )}
              </TableCell>
              <TableCell>
                <Link href={`/leads/${task.lead_uuid}`} className="text-brand-blue hover:underline">
                  {task.lead_uuid.slice(0, 8)}…
                </Link>
                {' · '}
                <Link href={`/tasks/${task.id}`} className="text-brand-blue hover:underline">
                  {t('common.view')}
                </Link>
              </TableCell>
              <TableCell>
                {!task.is_completed && (
                  <Button type="button" onClick={() => onComplete(task.id)}>
                    {t('common.complete')}
                  </Button>
                )}
                {task.is_completed && (
                  <span className="text-text-secondary">{t('common.done')}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
