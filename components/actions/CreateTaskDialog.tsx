import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { TASK_TYPES } from '@/lib/constants';

interface CreateTaskDialogProps {
  open: boolean;
  leadUuid: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTaskDialog({ open, leadUuid, onClose, onSuccess }: CreateTaskDialogProps) {
  const { locale, t } = useTranslation();
  const [taskType, setTaskType] = useState<string>(TASK_TYPES[0]);
  const [dueWhen, setDueWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dueWhen) return;
    setSaving(true);
    setError(null);

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_uuid: leadUuid,
        task_type: taskType,
        due_when: dueWhen,
        notes: notes || null,
      }),
    });

    setSaving(false);

    if (res.ok) {
      setTaskType(TASK_TYPES[0]);
      setDueWhen('');
      setNotes('');
      onSuccess();
      onClose();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('actions.createTaskTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label={t('actions.taskType')}>
            <FormSelect
              value={taskType}
              onValueChange={setTaskType}
              options={TASK_TYPES.map((v) => ({
                value: v,
                label: formatEnumLabel(locale, 'taskType', v),
              }))}
            />
          </FormField>
          <FormField label={t('actions.dueDate')}>
            <Input
              type="datetime-local"
              value={dueWhen}
              onChange={(e) => setDueWhen(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t('actions.notes')}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('actions.notesPlaceholder')}
              rows={2}
            />
          </FormField>
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !dueWhen}>
              {saving ? t('common.creating') : t('actions.createTask')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
