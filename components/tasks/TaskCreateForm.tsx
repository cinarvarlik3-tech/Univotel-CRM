/**
 * Form for creating a new task via POST /api/tasks.
 */
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>New task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Lead UUID *" htmlFor="lead_uuid">
            <Input
              id="lead_uuid"
              value={leadUuid}
              onChange={(e) => setLeadUuid(e.target.value)}
              required
            />
          </FormField>
          <FormSelect
            label="Task type"
            id="task_type"
            value={taskType}
            onValueChange={setTaskType}
            options={TASK_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <FormField label="Due *" htmlFor="due_when">
            <Input
              id="due_when"
              type="datetime-local"
              value={dueWhen}
              onChange={(e) => setDueWhen(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Notes" htmlFor="task_notes">
            <Textarea
              id="task_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </FormField>
          {user?.role === 'manager' && salespeople && (
            <FormSelect
              label="Assign to (optional)"
              id="assigned_to"
              value={assignedTo || '__none__'}
              onValueChange={(v) => setAssignedTo(v === '__none__' ? '' : v)}
              options={[
                { value: '__none__', label: 'Self / default' },
                ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
              ]}
            />
          )}
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
