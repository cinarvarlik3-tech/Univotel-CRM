/**
 * Modal dialog wrapper for creating a new task.
 * Replaces the inline TaskCreateForm on the revamped tasks page.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { LeadPickerInput } from '@/components/leads/LeadPickerInput';
import { TASK_TYPES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { formatEnumLabel } from '@/lib/i18n';
import { useSalespeople } from '@/hooks/useSalespeople';

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function TaskCreateDialog({ open, onClose, onCreated }: TaskCreateDialogProps) {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [leadUuid, setLeadUuid] = useState('');
  const [leadLabel, setLeadLabel] = useState('');
  const [taskType, setTaskType] = useState<string>(TASK_TYPES[0]);
  const [dueWhen, setDueWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && typeof router.query.lead_uuid === 'string') {
      setLeadUuid(router.query.lead_uuid);
    }
  }, [open, router.query.lead_uuid]);

  function resetForm() {
    setLeadUuid('');
    setLeadLabel('');
    setTaskType(TASK_TYPES[0]);
    setDueWhen('');
    setNotes('');
    setAssignedTo('');
    setError('');
  }

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

    resetForm();
    onCreated();
    onClose();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('tasks.newTask')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label={t('tasks.leadRequired')} htmlFor="dlg_lead_picker">
            <LeadPickerInput
              id="dlg_lead_picker"
              value={leadUuid}
              label={leadLabel}
              onChange={(uuid, label) => {
                setLeadUuid(uuid);
                setLeadLabel(label);
              }}
            />
            {!leadUuid && (
              <p className="mt-1 text-xs text-text-tertiary">İsim veya telefon ile arayın</p>
            )}
          </FormField>
          <FormSelect
            label={t('tasks.taskType')}
            id="dlg_task_type"
            value={taskType}
            onValueChange={setTaskType}
            options={TASK_TYPES.map((type) => ({
              value: type,
              label: formatEnumLabel(locale, 'task', type),
            }))}
          />
          <FormField label={t('tasks.dueRequired')} htmlFor="dlg_due_when">
            <DateTimePicker id="dlg_due_when" value={dueWhen} onChange={setDueWhen} required />
          </FormField>
          <FormField label={t('tasks.notes')} htmlFor="dlg_notes">
            <textarea
              id="dlg_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </FormField>
          {isManagerOrAbove(user?.role) && salespeople && (
            <FormSelect
              label={t('tasks.assignOptional')}
              id="dlg_assigned_to"
              value={assignedTo || '__none__'}
              onValueChange={(v) => setAssignedTo(v === '__none__' ? '' : v)}
              options={[
                { value: '__none__', label: t('common.selfDefault') },
                ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
              ]}
            />
          )}
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.creating') : t('tasks.createTask')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
