/**
 * Change room/property — update purchased_room type and optionally place in a room.
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
import { Checkbox } from '@/components/ui/checkbox';
import { FormSelect } from '@/components/ui/form-select';
import { Label } from '@/components/ui/label';
import { usePmsRoomTypes, usePmsRooms } from '@/hooks/usePms';
import { useTranslation } from '@/hooks/useTranslation';

interface ChangeRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadUuid: string | null;
  leadName: string | null;
  currentPropertyId: string | null;
  properties: { id: string; hotel_name: string }[];
  onConfirm: (leadId: string, newTypeId: string, toRoomId?: string) => Promise<void>;
}

export function ChangeRoomDialog({
  open,
  onOpenChange,
  leadUuid,
  leadName,
  currentPropertyId,
  properties,
  onConfirm,
}: ChangeRoomDialogProps) {
  const { t } = useTranslation();
  const [propertyId, setPropertyId] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [floor, setFloor] = useState('all');
  const [roomId, setRoomId] = useState('');
  const [typeOnly, setTypeOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: roomTypes } = usePmsRoomTypes(open && propertyId ? propertyId : null);
  const { data: rooms } = usePmsRooms(open && propertyId ? propertyId : null);

  const eligibleRooms = useMemo(() => {
    if (!roomTypeId || !rooms) return [];
    return rooms.filter((r) => r.roomTypeId === roomTypeId && !r.isFull);
  }, [rooms, roomTypeId]);

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
      setRoomTypeId('');
      setFloor('all');
      setRoomId('');
      setTypeOnly(false);
    }
  }, [open, currentPropertyId]);

  useEffect(() => {
    setRoomTypeId('');
    setFloor('all');
    setRoomId('');
  }, [propertyId]);

  useEffect(() => {
    setRoomId('');
  }, [roomTypeId, floor, typeOnly]);

  async function handleConfirm() {
    if (!leadUuid || !roomTypeId) return;
    if (!typeOnly && !roomId) return;

    setLoading(true);
    try {
      await onConfirm(leadUuid, roomTypeId, typeOnly ? undefined : roomId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = Boolean(roomTypeId && (typeOnly || roomId));

  if (!leadUuid) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pms.changeRoomTitle')}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{leadName ?? leadUuid}</p>

        <div className="space-y-3">
          <FormSelect
            id="change-property"
            label={t('pms.property')}
            value={propertyId}
            onValueChange={setPropertyId}
            options={properties.map((p) => ({ value: p.id, label: p.hotel_name }))}
          />

          <FormSelect
            id="change-type"
            label={t('pms.roomType')}
            value={roomTypeId}
            onValueChange={setRoomTypeId}
            options={(roomTypes ?? []).map((rt) => ({
              value: rt.id,
              label: rt.name,
            }))}
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="change-type-only"
              checked={typeOnly}
              onCheckedChange={(v) => setTypeOnly(v === true)}
            />
            <Label htmlFor="change-type-only" className="text-sm font-normal">
              {t('pms.typeOnly')}
            </Label>
          </div>

          {!typeOnly && roomTypeId && (
            <>
              <FormSelect
                id="change-floor"
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
                  id="change-room"
                  label={t('pms.selectRoom')}
                  value={roomId}
                  onValueChange={setRoomId}
                  options={floorFiltered.map((r) => ({
                    value: r.id,
                    label: `${r.roomNumber} (${r.floor}. kat)`,
                  }))}
                />
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!canSubmit || loading} onClick={handleConfirm}>
            {loading ? t('common.saving') : t('pms.changeRoom')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
