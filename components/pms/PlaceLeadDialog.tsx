/**
 * Place lead dialog — pick room (from unplaced) or pick lead (from empty room).
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import { useTranslation } from '@/hooks/useTranslation';
import type { PmsRoomWithOccupancy, PmsUnplacedLead } from '@/types/domain';

interface PlaceLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: PmsUnplacedLead | null;
  scopedRoom: PmsRoomWithOccupancy | null;
  unplacedLeads: PmsUnplacedLead[];
  rooms: PmsRoomWithOccupancy[];
  onConfirm: (leadId: string, roomId: string) => Promise<void>;
}

export function PlaceLeadDialog({
  open,
  onOpenChange,
  lead,
  scopedRoom,
  unplacedLeads,
  rooms,
  onConfirm,
}: PlaceLeadDialogProps) {
  const { t } = useTranslation();
  const [roomId, setRoomId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [loading, setLoading] = useState(false);

  const pickRoomMode = Boolean(lead);
  const pickLeadMode = Boolean(scopedRoom);

  const roomOptions = lead
    ? rooms.filter((r) => r.roomTypeId === lead.purchasedRoomTypeId && !r.isFull)
    : [];

  const leadOptions = scopedRoom
    ? unplacedLeads.filter((l) => l.purchasedRoomTypeId === scopedRoom.roomTypeId)
    : [];

  useEffect(() => {
    if (open) {
      setRoomId(scopedRoom?.id ?? '');
      setLeadId('');
    }
  }, [open, scopedRoom?.id]);

  async function handleConfirm() {
    const finalLeadId = pickRoomMode ? lead!.leadUuid : leadId;
    const finalRoomId = pickLeadMode ? scopedRoom!.id : roomId;
    if (!finalLeadId || !finalRoomId) return;

    setLoading(true);
    try {
      await onConfirm(finalLeadId, finalRoomId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = pickRoomMode ? Boolean(roomId) : pickLeadMode ? Boolean(leadId) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pms.placeTitle')}</DialogTitle>
        </DialogHeader>

        {pickRoomMode && lead && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{lead.leadName}</span>
              <span className="text-muted-foreground"> · {lead.purchasedRoomTypeName}</span>
            </p>
            <FormSelect
              id="place-room"
              label={t('pms.selectRoom')}
              value={roomId}
              onValueChange={setRoomId}
              options={roomOptions.map((r) => ({
                value: r.id,
                label: `${r.roomNumber} (${r.floor}. kat)`,
              }))}
            />
          </div>
        )}

        {pickLeadMode && scopedRoom && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {scopedRoom.roomNumber} · {scopedRoom.roomTypeName}
            </p>
            {leadOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('pms.noUnplacedForRoom')}</p>
            ) : (
              <FormSelect
                id="place-lead"
                label={t('pms.selectLead')}
                value={leadId}
                onValueChange={setLeadId}
                options={leadOptions.map((l) => ({
                  value: l.leadUuid,
                  label: l.leadName ?? l.leadUuid,
                }))}
              />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!canSubmit || loading} onClick={handleConfirm}>
            {loading ? t('common.saving') : t('pms.place')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
