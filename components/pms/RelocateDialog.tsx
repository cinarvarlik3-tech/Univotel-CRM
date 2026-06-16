/**
 * Relocate occupant — same purchased room type, different physical room.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import { usePmsRooms } from '@/hooks/usePms';
import { useTranslation } from '@/hooks/useTranslation';

interface RelocateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadUuid: string | null;
  leadName: string | null;
  roomTypeId: string | null;
  currentRoomId: string | null;
  currentPropertyId: string | null;
  properties: { id: string; hotel_name: string }[];
  onConfirm: (leadId: string, toRoomId: string) => Promise<void>;
}

export function RelocateDialog({
  open,
  onOpenChange,
  leadUuid,
  leadName,
  roomTypeId,
  currentRoomId,
  currentPropertyId,
  properties,
  onConfirm,
}: RelocateDialogProps) {
  const { t } = useTranslation();
  const [propertyId, setPropertyId] = useState('');
  const [floor, setFloor] = useState('all');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: rooms } = usePmsRooms(open && propertyId ? propertyId : null);

  const eligibleRooms = useMemo(() => {
    if (!roomTypeId || !rooms) return [];
    return rooms.filter((r) => r.roomTypeId === roomTypeId && !r.isFull && r.id !== currentRoomId);
  }, [rooms, roomTypeId, currentRoomId]);

  const floors = useMemo(
    () => [...new Set(eligibleRooms.map((r) => r.floor))].sort((a, b) => a - b),
    [eligibleRooms],
  );

  const floorFiltered = useMemo(() => {
    if (floor === 'all') return eligibleRooms;
    return eligibleRooms.filter((r) => String(r.floor) === floor);
  }, [eligibleRooms, floor]);

  useEffect(() => {
    if (open) {
      setPropertyId(currentPropertyId ?? '');
      setFloor('all');
      setRoomId('');
    }
  }, [open, currentPropertyId]);

  useEffect(() => {
    setRoomId('');
  }, [propertyId, floor]);

  async function handleConfirm() {
    if (!leadUuid || !roomId) return;
    setLoading(true);
    try {
      await onConfirm(leadUuid, roomId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  if (!leadUuid || !roomTypeId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pms.relocateTitle')}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{leadName ?? leadUuid}</p>

        <div className="space-y-3">
          <FormSelect
            id="relocate-property"
            label={t('pms.property')}
            value={propertyId}
            onValueChange={setPropertyId}
            options={properties.map((p) => ({ value: p.id, label: p.hotel_name }))}
          />

          <FormSelect
            id="relocate-floor"
            label={t('pms.floor')}
            value={floor}
            onValueChange={setFloor}
            options={[
              { value: 'all', label: t('pms.allFloors') },
              ...floors.map((f) => ({ value: String(f), label: String(f) })),
            ]}
          />

          {floorFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('pms.noRooms')}</p>
          ) : (
            <FormSelect
              id="relocate-room"
              label={t('pms.selectRoom')}
              value={roomId}
              onValueChange={setRoomId}
              options={floorFiltered.map((r) => ({
                value: r.id,
                label: `${r.roomNumber} (${r.floor}. kat)`,
              }))}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!roomId || loading} onClick={handleConfirm}>
            {loading ? t('common.saving') : t('pms.relocate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
