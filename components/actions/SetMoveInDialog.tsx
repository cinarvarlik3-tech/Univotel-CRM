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
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';

interface SetMoveInDialogProps {
  open: boolean;
  leadUuid: string;
  /** 'move_in' for expected date (kapora-alindi); 'actual_move_in_date' for deal-signed */
  field: 'move_in' | 'actual_move_in_date';
  currentValue?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetMoveInDialog({
  open,
  leadUuid,
  field,
  currentValue,
  onClose,
  onSuccess,
}: SetMoveInDialogProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState(currentValue ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    field === 'actual_move_in_date'
      ? t('actions.setActualMoveInTitle')
      : t('actions.setMoveInTitle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/lead-details/${leadUuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: date }),
    });

    setSaving(false);

    if (res.ok) {
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label={t('actions.moveInDateLabel')}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </FormField>
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !date}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
