/**
 * Confirm remove occupant dialog.
 */
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface ConfirmRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string | null;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmRemoveDialog({
  open,
  onOpenChange,
  leadName,
  loading,
  onConfirm,
}: ConfirmRemoveDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pms.removeTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('pms.removeConfirm', { name: leadName ?? '—' })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? t('common.saving') : t('common.yes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
