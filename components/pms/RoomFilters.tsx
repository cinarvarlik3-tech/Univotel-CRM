/**
 * Client-side filters for the PMS rooms grid.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { FormSelect } from '@/components/ui/form-select';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import type { PmsRoomWithOccupancy } from '@/types/domain';

export interface RoomFilterState {
  floor: string;
  roomTypeId: string;
  emptyOnly: boolean;
}

interface RoomFiltersProps {
  rooms: PmsRoomWithOccupancy[];
  filters: RoomFilterState;
  onChange: (next: RoomFilterState) => void;
  propertyOptions: { id: string; hotel_name: string }[];
  selectedPropertyId: string;
  onPropertyChange: (id: string) => void;
}

export function RoomFilters({
  rooms,
  filters,
  onChange,
  propertyOptions,
  selectedPropertyId,
  onPropertyChange,
}: RoomFiltersProps) {
  const { t } = useTranslation();

  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const roomTypes = [...new Map(rooms.map((r) => [r.roomTypeId, r.roomTypeName])).entries()].map(
    ([id, name]) => ({ id, name }),
  );

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-brand-blue bg-gradient-to-r from-brand-blue to-brand-blue-hover p-4 shadow-sm [&_label]:text-white/85">
      <div className="min-w-[180px]">
        <FormSelect
          id="pms-property-filter"
          label={t('pms.property')}
          value={selectedPropertyId}
          onValueChange={onPropertyChange}
          options={propertyOptions.map((p) => ({ value: p.id, label: p.hotel_name }))}
        />
      </div>

      <div className="min-w-[120px]">
        <FormSelect
          id="pms-floor-filter"
          label={t('pms.floor')}
          value={filters.floor}
          onValueChange={(floor) => onChange({ ...filters, floor })}
          options={[
            { value: 'all', label: t('common.all') },
            ...floors.map((f) => ({ value: String(f), label: String(f) })),
          ]}
        />
      </div>

      <div className="min-w-[160px]">
        <FormSelect
          id="pms-type-filter"
          label={t('pms.roomType')}
          value={filters.roomTypeId}
          onValueChange={(roomTypeId) => onChange({ ...filters, roomTypeId })}
          options={[
            { value: 'all', label: t('common.all') },
            ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
          ]}
        />
      </div>

      <div className="flex items-center gap-2 pb-1">
        <Checkbox
          id="pms-empty-only"
          checked={filters.emptyOnly}
          onCheckedChange={(checked) => onChange({ ...filters, emptyOnly: checked === true })}
          className="border-white/60 bg-white/10 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-brand-blue"
        />
        <Label htmlFor="pms-empty-only" className="text-sm">
          {t('pms.emptyOnly')}
        </Label>
      </div>
    </div>
  );
}

export function filterRooms(
  rooms: PmsRoomWithOccupancy[],
  filters: RoomFilterState,
): PmsRoomWithOccupancy[] {
  return rooms.filter((r) => {
    if (filters.floor !== 'all' && String(r.floor) !== filters.floor) return false;
    if (filters.roomTypeId !== 'all' && r.roomTypeId !== filters.roomTypeId) return false;
    if (filters.emptyOnly && r.occupantCount > 0) return false;
    return true;
  });
}
