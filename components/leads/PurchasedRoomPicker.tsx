/**
 * Property + room type picker for purchased_room funnel capture.
 */
import { useEffect, useState } from 'react';
import { FormSelect } from '@/components/ui/form-select';
import { usePmsProperties, usePmsRoomTypes } from '@/hooks/usePms';
import { useTranslation } from '@/hooks/useTranslation';

export interface PurchasedRoomPickerValue {
  propertyId: string;
  roomTypeId: string;
}

interface PurchasedRoomPickerProps {
  initialPropertyId?: string | null;
  initialRoomTypeId?: string | null;
  onChange: (value: PurchasedRoomPickerValue | null) => void;
}

export function PurchasedRoomPicker({
  initialPropertyId,
  initialRoomTypeId,
  onChange,
}: PurchasedRoomPickerProps) {
  const { t } = useTranslation();
  const { data: properties } = usePmsProperties();
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? '');
  const [roomTypeId, setRoomTypeId] = useState(initialRoomTypeId ?? '');

  const { data: roomTypes } = usePmsRoomTypes(propertyId || null);

  useEffect(() => {
    if (initialPropertyId) setPropertyId(initialPropertyId);
    if (initialRoomTypeId) setRoomTypeId(initialRoomTypeId);
  }, [initialPropertyId, initialRoomTypeId]);

  useEffect(() => {
    setRoomTypeId('');
  }, [propertyId]);

  useEffect(() => {
    if (propertyId && roomTypeId) {
      onChange({ propertyId, roomTypeId });
    } else {
      onChange(null);
    }
  }, [propertyId, roomTypeId, onChange]);

  return (
    <div className="space-y-3">
      <FormSelect
        id="purchased-property"
        label={t('pms.property')}
        value={propertyId}
        onValueChange={setPropertyId}
        options={(properties ?? []).map((p) => ({ value: p.id, label: p.hotel_name }))}
      />
      <FormSelect
        id="purchased-room-type"
        label={t('pms.roomType')}
        value={roomTypeId}
        onValueChange={setRoomTypeId}
        options={(roomTypes ?? []).map((rt) => ({ value: rt.id, label: rt.name }))}
      />
    </div>
  );
}
