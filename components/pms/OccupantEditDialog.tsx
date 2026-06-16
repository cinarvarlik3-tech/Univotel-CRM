/**
 * Occupant edit actions dialog (remove / relocate / change).
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
import type { PmsRoomWithOccupancy } from '@/types/domain';

interface OccupantEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: PmsRoomWithOccupancy | null;
  leadRoomId: string | null;
  leadName: string | null;
  onRemove: () => void;
  onRelocate: () => void;
  onChangeRoom: () => void;
}

export function OccupantEditDialog({
  open,
  onOpenChange,
  room,
  leadRoomId,
  leadName,
  onRemove,
  onRelocate,
  onChangeRoom,
}: OccupantEditDialogProps) {
  const { t } = useTranslation();

  if (!room || !leadRoomId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{leadName ?? t('pms.occupant')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {room.roomNumber} · {room.roomTypeName}
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={onRemove}>
            {t('pms.remove')}
          </Button>
          <Button variant="outline" onClick={onRelocate}>
            {t('pms.relocate')}
          </Button>
          <Button variant="outline" onClick={onChangeRoom}>
            {t('pms.changeRoom')}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
