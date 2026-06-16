/**
 * Single PMS room card with occupancy color coding.
 */
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateOnly } from '@/lib/i18n/format-date';
import { cn } from '@/lib/utils';
import type { PmsRoomWithOccupancy } from '@/types/domain';
import type { Locale } from '@/lib/i18n/types';

interface RoomCardProps {
  room: PmsRoomWithOccupancy;
  locale: Locale;
  canWrite: boolean;
  onPlace?: (room: PmsRoomWithOccupancy) => void;
  onEditOccupant?: (room: PmsRoomWithOccupancy, leadRoomId: string) => void;
}

function occupancyClasses(room: PmsRoomWithOccupancy): string {
  if (room.occupantCount === 0) {
    return 'border-emerald-500/30 bg-emerald-500/5';
  }
  if (room.isFull) {
    return 'border-rose-500/30 bg-rose-500/5';
  }
  return 'border-amber-500/30 bg-amber-500/5';
}

export function RoomCard({ room, locale, canWrite, onPlace, onEditOccupant }: RoomCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn('flex min-h-[180px] flex-col rounded-xl border p-3', occupancyClasses(room))}
    >
      <p className="text-lg font-semibold text-foreground">{room.roomNumber}</p>

      <div className="mt-2 flex-1 space-y-2">
        {room.occupants.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('pms.emptyRoom')}</p>
            {canWrite && !room.isFull && (
              <Button size="sm" variant="outline" onClick={() => onPlace?.(room)}>
                {t('pms.place')}
              </Button>
            )}
          </div>
        ) : (
          room.occupants.map((o) => (
            <div
              key={o.leadRoomId}
              className="rounded-lg border border-border/60 bg-background/60 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{o.leadName ?? '—'}</p>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => onEditOccupant?.(room, o.leadRoomId)}
                  >
                    {t('common.edit')}
                  </Button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {o.actualMoveIn
                  ? t('pms.movedIn', { date: formatDateOnly(o.actualMoveIn, locale) })
                  : o.moveIn
                    ? t('pms.expected', { date: formatDateOnly(o.moveIn, locale) })
                    : '—'}
              </p>
            </div>
          ))
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{room.roomTypeName}</p>
    </div>
  );
}
