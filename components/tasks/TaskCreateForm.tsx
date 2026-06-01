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
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { formatEnumLabel } from '@/lib/i18n';
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
  const { locale, t } = useTranslation();
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
      setError(t('tasks.requiredFields'));
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
    if (isManagerOrAbove(user?.role) && assignedTo) {
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
      setError(json.error ?? t('tasks.createFailed'));
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
        <CardTitle>{t('tasks.newTask')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label={t('tasks.leadUuidRequired')} htmlFor="lead_uuid">
            <Input
              id="lead_uuid"
              value={leadUuid}
              onChange={(e) => setLeadUuid(e.target.value)}
              required
            />
          </FormField>
          <FormSelect
            label={t('tasks.taskType')}
            id="task_type"
            value={taskType}
            onValueChange={setTaskType}
            options={TASK_TYPES.map((type) => ({
              value: type,
              label: formatEnumLabel(locale, 'task', type),
            }))}
          />
          <FormField label={t('tasks.dueRequired')} htmlFor="due_when">
            <Input
              id="due_when"
              type="datetime-local"
              value={dueWhen}
              onChange={(e) => setDueWhen(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t('tasks.notes')} htmlFor="task_notes">
            <Textarea
              id="task_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </FormField>
          {isManagerOrAbove(user?.role) && salespeople && (
            <FormSelect
              label={t('tasks.assignOptional')}
              id="assigned_to"
              value={assignedTo || '__none__'}
              onValueChange={(v) => setAssignedTo(v === '__none__' ? '' : v)}
              options={[
                { value: '__none__', label: t('common.selfDefault') },
                ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
              ]}
            />
          )}
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? t('common.creating') : t('tasks.createTask')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
