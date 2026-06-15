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
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { dateFnsLocale } from '@/components/calendar/calendar-utils';

interface RescheduleDatePopoverProps {
  label: string;
  currentDate: Date;
  /** ISO string or YYYY-MM-DD for all-day events. */
  onConfirm: (newDateIso: string) => Promise<boolean>;
  onSuccess?: () => void;
  /** `date` for all-day move-ins; `datetime-local` for timed visits. */
  inputType?: 'date' | 'datetime-local';
  /** i18n key for the confirm-step preview line (defaults to calendar.reschedulePreview). */
  previewMessageKey?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toInputValue(date: Date, inputType: 'date' | 'datetime-local'): string {
  if (inputType === 'date') {
    return format(date, 'yyyy-MM-dd');
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function inputToIso(value: string, inputType: 'date' | 'datetime-local'): string {
  if (inputType === 'date') {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toISOString();
  }
  return new Date(value).toISOString();
}

export function RescheduleDatePopover({
  label,
  currentDate,
  onConfirm,
  onSuccess,
  inputType = 'datetime-local',
  previewMessageKey = 'calendar.reschedulePreview',
  open,
  onOpenChange,
}: RescheduleDatePopoverProps) {
  const { locale, t } = useTranslation();
  const fnsLocale = dateFnsLocale(locale);
  const [value, setValue] = useState(() => toInputValue(currentDate, inputType));
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');

  const oldLabel =
    inputType === 'date'
      ? format(currentDate, 'd MMM yyyy', { locale: fnsLocale })
      : format(currentDate, 'd MMM yyyy HH:mm', { locale: fnsLocale });
  const newLabel = value
    ? inputType === 'date'
      ? format(new Date(`${value}T00:00:00`), 'd MMM yyyy', { locale: fnsLocale })
      : format(new Date(value), 'd MMM yyyy HH:mm', { locale: fnsLocale })
    : '';

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setValue(toInputValue(currentDate, inputType));
      setStep('pick');
    }
  }

  async function handleConfirm() {
    if (!value) return;
    setSaving(true);
    const ok = await onConfirm(inputToIso(value, inputType));
    setSaving(false);
    if (ok) {
      onOpenChange(false);
      onSuccess?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        {step === 'pick' ? (
          <>
            <Input type={inputType} value={value} onChange={(e) => setValue(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" disabled={!value} onClick={() => setStep('confirm')}>
                {t('common.continue')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              {t(previewMessageKey, { oldDate: oldLabel, newDate: newLabel })}
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep('pick')}>
                {t('common.back')}
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={saving}>
                {saving ? t('common.saving') : t('calendar.reschedule')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
