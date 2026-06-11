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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { MANUAL_INTERACTION_TYPES } from '@/lib/constants';

interface LogContactDialogProps {
  open: boolean;
  leadUuid: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogContactDialog({ open, leadUuid, onClose, onSuccess }: LogContactDialogProps) {
  const { t } = useTranslation();
  const [interactionType, setInteractionType] = useState<string>(MANUAL_INTERACTION_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interactionTypeLabels: Record<string, string> = {
    call_success: t('actions.callSuccess'),
    call_fail: t('actions.callFail'),
    message_sent: t('actions.messageSent'),
    callback_scheduled: t('actions.callbackScheduled'),
    correction: t('actions.correction'),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadUuid}/log-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interaction_type: interactionType, notes: notes || undefined }),
    });

    setSaving(false);

    if (res.ok) {
      setNotes('');
      setInteractionType(MANUAL_INTERACTION_TYPES[0]);
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
          <DialogTitle>{t('actions.logContactTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label={t('actions.interactionType')}>
            <FormSelect
              value={interactionType}
              onValueChange={setInteractionType}
              options={MANUAL_INTERACTION_TYPES.map((v) => ({
                value: v,
                label: interactionTypeLabels[v] ?? v,
              }))}
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
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
