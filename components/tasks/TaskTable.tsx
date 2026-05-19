/**
 * Task list table with inline notes editing.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
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

  return (
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Due</th>
          <th>Late</th>
          <th>Notes</th>
          <th>Lead</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>{task.task_type}</td>
            <td>{new Date(task.due_when).toLocaleString('tr-TR')}</td>
            <td>{task.is_late ? 'Yes' : 'No'}</td>
            <td>
              {editingId === task.id ? (
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      type="button"
                      onClick={() => saveNotes(task.id)}
                      disabled={saving}
                    >
                      Save
                    </Button>
                    <Button type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(task.id);
                    setEditNotes(task.notes ?? '');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  {truncateNotes(task.notes)}
                </button>
              )}
            </td>
            <td>
              <Link href={`/leads/${task.lead_uuid}`}>{task.lead_uuid.slice(0, 8)}…</Link>
              {' · '}
              <Link href={`/tasks/${task.id}`}>view</Link>
            </td>
            <td>
              {!task.is_completed && (
                <Button type="button" onClick={() => onComplete(task.id)}>
                  Complete
                </Button>
              )}
              {task.is_completed && 'Done'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
