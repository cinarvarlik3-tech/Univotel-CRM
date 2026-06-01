/**
 * Manual archive modal for manager lead actions.
 */
import { useState } from 'react';
import { ARCHIVE_REASONS, MANUAL_LOSS_REASONS } from '@/lib/constants';
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
import { formatEnumLabel } from '@/lib/i18n/enum-labels';

interface ArchiveLeadModalProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
  onArchived: (uuid: string) => void;
}

/**
 * Modal form for manual lead archive with outcome and loss reason.
 * @param props - Lead id, visibility, and callbacks.
 * @returns Dialog modal element.
 */
export function ArchiveLeadModal({ leadId, open, onClose, onArchived }: ArchiveLeadModalProps) {
  const { locale, t } = useTranslation();
  const [archiveReason, setArchiveReason] = useState<(typeof ARCHIVE_REASONS)[number]>('won');
  const [lossReason, setLossReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (archiveReason === 'lost' && !lossReason) {
      setError(t('leads.lossReasonRequiredLost'));
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, string> = { archive_reason: archiveReason };
    if (archiveReason === 'lost') body.loss_reason = lossReason;

    const res = await fetch(`/api/leads/${leadId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? t('leads.archiveFailed'));
      return;
    }

    onArchived(leadId);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('leads.archiveModalTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FormSelect
            label={t('filters.outcome')}
            id="archive_reason"
            value={archiveReason}
            onValueChange={(v) => setArchiveReason(v as (typeof ARCHIVE_REASONS)[number])}
            options={[
              { value: 'won', label: formatEnumLabel(locale, 'archive', 'won') },
              { value: 'lost', label: formatEnumLabel(locale, 'archive', 'lost') },
            ]}
          />
          {archiveReason === 'lost' && (
            <FormSelect
              label={t('filters.lossReason')}
              id="archive_loss_reason"
              value={lossReason}
              onValueChange={setLossReason}
              placeholder={t('common.select')}
              options={MANUAL_LOSS_REASONS.map((reason) => ({
                value: reason,
                label: formatEnumLabel(locale, 'loss', reason),
              }))}
            />
          )}
          {error && <p className="text-xs text-brand-red">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? t('common.archiving') : t('leads.archive')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
