import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormSelect } from '@/components/ui/form-select';
import { useTranslation } from '@/hooks/useTranslation';
import type { SalespersonOption } from '@/types/domain';

interface ReassignModalProps {
  open: boolean;
  leadUuid: string;
  leadName?: string | null;
  currentAssigneeId?: string | null;
  salespeople: SalespersonOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ReassignModal({
  open,
  leadUuid,
  leadName,
  currentAssigneeId,
  salespeople,
  onClose,
  onSuccess,
}: ReassignModalProps) {
  const { t } = useTranslation();
  const [assignedTo, setAssignedTo] = useState(currentAssigneeId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadUuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assignedTo || null }),
    });

    setSaving(false);

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? t('leads.reassignFailed'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('actions.reassign')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {leadName && <p className="text-sm font-medium text-text-primary">{leadName}</p>}
          <FormSelect
            label={t('leads.reassignTo')}
            value={assignedTo || '__none__'}
            onValueChange={(v) => setAssignedTo(v === '__none__' ? '' : v)}
            options={[
              { value: '__none__', label: t('common.unassigned') },
              ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
            ]}
          />
          {error && <p className="text-xs text-brand-red">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving}>
            {saving ? t('common.saving') : t('leads.saveAssignment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
