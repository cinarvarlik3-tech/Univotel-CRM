/**
 * Collects finance inputs when clearing loss_reason back into kapora/sözleşme.
 */
import { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  defaultFinanceTerms,
  FinanceTermsFields,
  type FinanceTermsValue,
} from '@/components/finance/FinanceTermsFields';
import { useTranslation } from '@/hooks/useTranslation';
import type { FinancialFunnelStatus } from '@/lib/leads/apply-loss-reason-update';
import {
  PurchasedRoomPicker,
  type PurchasedRoomPickerValue,
} from '@/components/leads/PurchasedRoomPicker';

interface LossRecoveryFinanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  targetStatus: FinancialFunnelStatus;
  initialPropertyId?: string | null;
  initialRoomTypeId?: string | null;
  onSuccess: (lead?: Record<string, unknown>) => void;
}

export function LossRecoveryFinanceDialog({
  open,
  onOpenChange,
  leadId,
  targetStatus,
  initialPropertyId,
  initialRoomTypeId,
  onSuccess,
}: LossRecoveryFinanceDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState<PurchasedRoomPickerValue | null>(null);
  const [financeTerms, setFinanceTerms] = useState<FinanceTermsValue>(defaultFinanceTerms());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((next: PurchasedRoomPickerValue | null) => {
    setValue(next);
  }, []);

  async function handleConfirm() {
    const roomTypeId = value?.roomTypeId ?? initialRoomTypeId;
    if (!roomTypeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loss_reason: null,
          purchased_room: roomTypeId,
          move_in_month: financeTerms.moveInMonth,
          deal_duration: financeTerms.dealDuration,
          discount: financeTerms.discount,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? t('leads.updateFailed'));
        return;
      }
      onSuccess(json.data as Record<string, unknown>);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const roomTypeId = value?.roomTypeId ?? initialRoomTypeId ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('finance.lossRecoveryTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {targetStatus === 'kapora-alindi'
            ? t('finance.lossRecoveryKaporaHint')
            : t('finance.lossRecoverySozlesmeHint')}
        </p>
        <PurchasedRoomPicker
          initialPropertyId={initialPropertyId}
          initialRoomTypeId={initialRoomTypeId}
          onChange={handleChange}
        />
        <FinanceTermsFields
          value={financeTerms}
          onChange={setFinanceTerms}
          roomTypeId={roomTypeId}
        />
        {error && <p className="text-xs text-brand-red">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!roomTypeId || loading} onClick={handleConfirm}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
