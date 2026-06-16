/**
 * Floor-grouped 3-column room grid.
 */
import { formatFloorLabel } from '@/lib/pms/floor-display';
import type { PmsRoomWithOccupancy } from '@/types/domain';
import type { Locale } from '@/lib/i18n/types';
import { RoomCard } from '@/components/pms/RoomCard';

interface RoomsGridProps {
  rooms: PmsRoomWithOccupancy[];
  locale: Locale;
  canWrite: boolean;
  onPlace?: (room: PmsRoomWithOccupancy) => void;
  onEditOccupant?: (room: PmsRoomWithOccupancy, leadRoomId: string) => void;
}

export function RoomsGrid({ rooms, locale, canWrite, onPlace, onEditOccupant }: RoomsGridProps) {
  const byFloor = new Map<number, PmsRoomWithOccupancy[]>();
  for (const room of rooms) {
    const list = byFloor.get(room.floor) ?? [];
    list.push(room);
    byFloor.set(room.floor, list);
  }

  const floors = [...byFloor.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <section key={floor}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{formatFloorLabel(floor)}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(byFloor.get(floor) ?? []).map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                locale={locale}
                canWrite={canWrite}
                onPlace={onPlace}
                onEditOccupant={onEditOccupant}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
