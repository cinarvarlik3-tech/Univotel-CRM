/**
 * Purchased room dialog — kapora / sözleşme / visit downpayment room-type + finance terms capture.
 */
import { useCallback, useEffect, useState } from 'react';
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
import {
  PurchasedRoomPicker,
  type PurchasedRoomPickerValue,
} from '@/components/leads/PurchasedRoomPicker';

export type PurchasedRoomConfirmPayload = {
  roomTypeId: string;
  financeTerms: FinanceTermsValue;
};

interface PurchasedRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadName?: string | null;
  mode: 'required' | 'confirm';
  initialPropertyId?: string | null;
  initialRoomTypeId?: string | null;
  initialFinanceTerms?: FinanceTermsValue;
  /** When false, only room selection is shown (e.g. profile edit without funnel advance). */
  showFinanceTerms?: boolean;
  onConfirm: (payload: PurchasedRoomConfirmPayload) => Promise<void>;
}

export function PurchasedRoomDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  mode,
  initialPropertyId,
  initialRoomTypeId,
  initialFinanceTerms,
  showFinanceTerms = true,
  onConfirm,
}: PurchasedRoomDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState<PurchasedRoomPickerValue | null>(null);
  const [financeTerms, setFinanceTerms] = useState<FinanceTermsValue>(
    initialFinanceTerms ?? defaultFinanceTerms(),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFinanceTerms(initialFinanceTerms ?? defaultFinanceTerms());
    if (mode !== 'confirm' || !leadId) return;

    let cancelled = false;
    void fetch(`/api/leads/${leadId}/active-finance`)
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const row = json.data;
        if (!row || cancelled) return;
        setFinanceTerms({
          moveInMonth: row.moveInMonth ?? defaultFinanceTerms().moveInMonth,
          dealDuration: row.dealDuration ?? defaultFinanceTerms().dealDuration,
          discount: row.discount ?? 0,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, leadId, mode, initialFinanceTerms]);

  const handleChange = useCallback((next: PurchasedRoomPickerValue | null) => {
    setValue(next);
  }, []);

  async function handleConfirm() {
    const roomTypeId = value?.roomTypeId ?? initialRoomTypeId;
    if (!roomTypeId) return;
    setLoading(true);
    try {
      await onConfirm({ roomTypeId, financeTerms });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const roomTypeId = value?.roomTypeId ?? initialRoomTypeId ?? null;
  const title =
    mode === 'confirm' ? t('leads.purchasedRoomConfirmTitle') : t('leads.purchasedRoomTitle');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {leadName && <p className="text-sm text-muted-foreground">{leadName}</p>}

        <p className="text-sm text-muted-foreground">
          {mode === 'confirm' ? t('leads.purchasedRoomConfirmHint') : t('leads.purchasedRoomHint')}
        </p>

        <PurchasedRoomPicker
          initialPropertyId={initialPropertyId}
          initialRoomTypeId={initialRoomTypeId}
          onChange={handleChange}
        />

        {showFinanceTerms && (
          <FinanceTermsFields
            value={financeTerms}
            onChange={setFinanceTerms}
            roomTypeId={roomTypeId}
          />
        )}

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
