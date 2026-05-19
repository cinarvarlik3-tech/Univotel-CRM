/**
 * Form for creating a new task via POST /api/tasks.
 */
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TASK_TYPES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useSalespeople } from '@/hooks/useSalespeople';

interface TaskCreateFormProps {
  onCreated: () => void;
}

/**
 * Renders task creation form with optional lead UUID prefill from query.
 * @param props - Callback after successful create.
 * @returns Task create form element.
 */
export function TaskCreateForm({ onCreated }: TaskCreateFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [leadUuid, setLeadUuid] = useState('');
  const [taskType, setTaskType] = useState<string>(TASK_TYPES[0]);
  const [dueWhen, setDueWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof router.query.lead_uuid === 'string') {
      setLeadUuid(router.query.lead_uuid);
    }
  }, [router.query.lead_uuid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadUuid || !dueWhen) {
      setError('Lead UUID and due date are required');
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, string> = {
      lead_uuid: leadUuid,
      task_type: taskType,
      due_when: new Date(dueWhen).toISOString(),
    };

    if (notes) body.notes = notes;
    if (user?.role === 'manager' && assignedTo) {
      body.assigned_to = assignedTo;
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Failed to create task');
      return;
    }

    setNotes('');
    setDueWhen('');
    if (!router.query.lead_uuid) setLeadUuid('');
    onCreated();
  }

  return (
    <div className="card">
      <h3>New task</h3>
      <form onSubmit={handleSubmit}>
        <Input
          label="Lead UUID *"
          id="lead_uuid"
          value={leadUuid}
          onChange={(e) => setLeadUuid(e.target.value)}
          required
        />
        <Select
          label="Task type"
          id="task_type"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
        >
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Input
          label="Due *"
          id="due_when"
          type="datetime-local"
          value={dueWhen}
          onChange={(e) => setDueWhen(e.target.value)}
          required
        />
        <label htmlFor="task_notes">
          <div>Notes</div>
          <textarea
            id="task_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </label>
        {user?.role === 'manager' && salespeople && (
          <Select
            label="Assign to (optional)"
            id="assigned_to"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="">Self / default</option>
            {salespeople.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.full_name}
              </option>
            ))}
          </Select>
        )}
        {error && <p className="error">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Creating...' : 'Create task'}
        </Button>
      </form>
    </div>
  );
}
