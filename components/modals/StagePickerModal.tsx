import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormSelect } from '@/components/ui/form-select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { getForwardFunnelStages } from '@/lib/leads/funnel-stages';

interface StagePickerModalProps {
  open: boolean;
  leadUuid: string;
  leadName?: string | null;
  currentStage: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StagePickerModal({
  open,
  leadUuid,
  leadName,
  currentStage,
  onClose,
  onSuccess,
}: StagePickerModalProps) {
  const { locale, t } = useTranslation();
  const forwardStages = useMemo(() => getForwardFunnelStages(currentStage), [currentStage]);
  const [selected, setSelected] = useState(forwardStages[0] ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = forwardStages.map((s) => ({
    value: s,
    label: formatEnumLabel(locale, 'funnel', s),
  }));

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadUuid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnel_status: selected }),
    });

    setSaving(false);

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? t('leads.updateFailed'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('actions.moveStage')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {leadName && <p className="text-sm font-medium text-text-primary">{leadName}</p>}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{t('leads.funnelStatus')}:</span>
            <StatusBadge type="funnel" status={currentStage} />
          </div>

          {options.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('actions.noForwardStages')}</p>
          ) : (
            <FormSelect
              label={t('actions.selectStage')}
              value={selected}
              onValueChange={setSelected}
              options={options}
            />
          )}

          {error && <p className="text-xs text-brand-red">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !selected || options.length === 0}
          >
            {saving ? t('common.saving') : t('actions.moveStageConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
