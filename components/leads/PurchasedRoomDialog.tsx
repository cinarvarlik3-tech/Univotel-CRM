/**
 * Purchased room dialog — kapora / sözleşme / visit downpayment room-type capture.
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
import { useTranslation } from '@/hooks/useTranslation';
import {
  PurchasedRoomPicker,
  type PurchasedRoomPickerValue,
} from '@/components/leads/PurchasedRoomPicker';

interface PurchasedRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName?: string | null;
  mode: 'required' | 'confirm';
  initialPropertyId?: string | null;
  initialRoomTypeId?: string | null;
  onConfirm: (roomTypeId: string) => Promise<void>;
}

export function PurchasedRoomDialog({
  open,
  onOpenChange,
  leadName,
  mode,
  initialPropertyId,
  initialRoomTypeId,
  onConfirm,
}: PurchasedRoomDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState<PurchasedRoomPickerValue | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback((next: PurchasedRoomPickerValue | null) => {
    setValue(next);
  }, []);

  async function handleConfirm() {
    if (!value?.roomTypeId) return;
    setLoading(true);
    try {
      await onConfirm(value.roomTypeId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!value?.roomTypeId || loading} onClick={handleConfirm}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
