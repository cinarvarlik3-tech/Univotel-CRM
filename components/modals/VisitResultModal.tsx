import { useState } from 'react';
import { format } from 'date-fns';
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
import { LOSS_REASONS } from '@/lib/constants';
import {
  PurchasedRoomPicker,
  type PurchasedRoomPickerValue,
} from '@/components/leads/PurchasedRoomPicker';
import { dateFnsLocale } from '@/components/calendar/calendar-utils';

export type VisitResultOutcome = 'decision_pending' | 'downpayment' | 'dropped';

interface VisitResultModalProps {
  open: boolean;
  visitId: string;
  leadUuid: string;
  leadName?: string | null;
  visitDate: Date;
  onClose: () => void;
  onSuccess: (outcome: VisitResultOutcome) => void;
}

export function VisitResultModal({
  open,
  visitId,
  leadUuid,
  leadName,
  visitDate,
  onClose,
  onSuccess,
}: VisitResultModalProps) {
  const { locale, t } = useTranslation();
  const fnsLocale = dateFnsLocale(locale);
  const [step, setStep] = useState<'pick' | 'confirm' | 'room'>('pick');
  const [outcome, setOutcome] = useState<VisitResultOutcome | null>(null);
  const [lossReason, setLossReason] = useState('');
  const [purchasedRoom, setPurchasedRoom] = useState<PurchasedRoomPickerValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep('pick');
    setOutcome(null);
    setLossReason('');
    setPurchasedRoom(null);
    setError(null);
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      reset();
      onClose();
    }
  }

  const outcomeLabels: Record<VisitResultOutcome, string> = {
    decision_pending: t('actions.visitOutcomeDecision'),
    downpayment: t('actions.visitOutcomeDownpayment'),
    dropped: t('actions.visitOutcomeDropped'),
  };

  async function handleSave() {
    if (!outcome) return;
    if (outcome === 'dropped' && !lossReason) return;
    if (outcome === 'downpayment' && !purchasedRoom?.roomTypeId) return;

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/visits/${visitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        loss_reason: outcome === 'dropped' ? lossReason : undefined,
        lead_uuid: leadUuid,
        purchased_room: outcome === 'downpayment' ? purchasedRoom?.roomTypeId : undefined,
      }),
    });

    setSaving(false);

    if (res.ok) {
      onSuccess(outcome);
      reset();
      onClose();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? t('leads.updateFailed'));
    }
  }

  const dateLabel = format(visitDate, 'd MMMM yyyy', { locale: fnsLocale });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('actions.visitResult')}</DialogTitle>
        </DialogHeader>

        {step === 'pick' ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {leadName ?? leadUuid} · {dateLabel}
            </p>
            <div className="space-y-2">
              {(['decision_pending', 'downpayment', 'dropped'] as const).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-border-default p-3 hover:bg-row-hover"
                >
                  <input
                    type="radio"
                    name="visit_outcome"
                    className="mt-1"
                    checked={outcome === key}
                    onChange={() => setOutcome(key)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{outcomeLabels[key]}</span>
                    <span className="text-xs text-text-secondary">
                      {t(`actions.visitOutcomeHint_${key}`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {error && <p className="text-xs text-brand-red">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                disabled={!outcome}
                onClick={() => {
                  if (outcome === 'downpayment') setStep('room');
                  else setStep('confirm');
                }}
              >
                {t('common.continue')}
              </Button>
            </DialogFooter>
          </div>
        ) : step === 'room' ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{t('leads.purchasedRoomHint')}</p>
            <PurchasedRoomPicker onChange={setPurchasedRoom} />
            {error && <p className="text-xs text-brand-red">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep('pick')}>
                {t('common.back')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !purchasedRoom?.roomTypeId}
              >
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {outcome === 'dropped' ? (
              <FormSelect
                label={t('actions.dropReason')}
                value={lossReason}
                onValueChange={setLossReason}
                options={LOSS_REASONS.map((r) => ({
                  value: r,
                  label: formatEnumLabel(locale, 'loss', r),
                }))}
                placeholder={t('leads.selectReason')}
              />
            ) : (
              <p className="text-sm text-text-secondary">
                {t('actions.visitOutcomeConfirm', {
                  stage: outcome ? outcomeLabels[outcome] : '',
                })}
              </p>
            )}
            {error && <p className="text-xs text-brand-red">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep('pick')}>
                {t('common.back')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || (outcome === 'dropped' && !lossReason)}
              >
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
