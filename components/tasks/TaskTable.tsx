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
function truncateNotes(notes: string | null): string {
  if (!notes) return '—';
  return notes.length > 60 ? `${notes.slice(0, 60)}…` : notes;
}

/**
 * Renders tasks table with completion and notes edit.
 * @param props - Tasks array and handlers.
 * @returns Tasks table element.
 */
export function TaskTable({ tasks, onComplete, onNotesUpdated }: TaskTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
    return <p className="py-8 text-center text-sm text-text-secondary">No tasks found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>Type</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Late</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>{task.task_type}</TableCell>
              <TableCell className="text-text-secondary">
                {new Date(task.due_when).toLocaleString('tr-TR')}
              </TableCell>
              <TableCell className="text-text-secondary">{task.is_late ? 'Yes' : 'No'}</TableCell>
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
                        Save
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                        Cancel
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
                    {truncateNotes(task.notes)}
                  </Button>
                )}
              </TableCell>
              <TableCell>
                <Link href={`/leads/${task.lead_uuid}`} className="text-brand-blue hover:underline">
                  {task.lead_uuid.slice(0, 8)}…
                </Link>
                {' · '}
                <Link href={`/tasks/${task.id}`} className="text-brand-blue hover:underline">
                  view
                </Link>
              </TableCell>
              <TableCell>
                {!task.is_completed && (
                  <Button type="button" onClick={() => onComplete(task.id)}>
                    Complete
                  </Button>
                )}
                {task.is_completed && <span className="text-text-secondary">Done</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
