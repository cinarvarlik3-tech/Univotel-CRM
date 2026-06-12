/**
 * Full-width rectangular visit card for calendar grid cells.
 * Shows lead name, room preference, and phone — sized to fill most of the
 * parent day or hour slot.
 */
import { format } from 'date-fns';
import { IconGripVertical } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { accentChipClasses, dateFnsLocale } from './calendar-utils';
import type { CalendarEvent } from './types';

interface VisitEventCardProps {
  event: CalendarEvent;
  locale: string;
  /** When true the card stretches to fill its grid cell (week/day hour slots). */
  fill?: boolean;
  onClick: (event: CalendarEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
}

/**
 * Renders a visit as a rectangular card with lead details.
 * @param props - Event data, locale, fill mode, and interaction handlers.
 * @returns Draggable visit card button.
 */
export function VisitEventCard({
  event,
  locale,
  fill = false,
  onClick,
  onDragStart,
  onDragEnd,
}: VisitEventCardProps) {
  const { t } = useTranslation();
  const fnsLocale = dateFnsLocale(locale);
  const draggable = Boolean(event.draggable && onDragStart);
  const timeLabel = event.allDay ? null : format(event.start, 'HH:mm', { locale: fnsLocale });
  const phone = event.cardDetails?.phone;
  const room = event.cardDetails?.roomPreference;

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={() => onDragStart?.(event)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(event)}
      className={cn(
        'flex flex-col overflow-hidden rounded-md border border-border-default text-left shadow-sm transition-shadow',
        'hover:shadow-md',
        accentChipClasses(event.accent),
        fill ? 'absolute inset-0.5' : 'min-h-[52px] w-full flex-1',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-1.5">
        <div className="flex items-start gap-1">
          {draggable && <IconGripVertical className="mt-0.5 size-3 shrink-0 opacity-40" />}
          <p className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight">
            {event.title}
          </p>
          {timeLabel && (
            <span className="shrink-0 font-mono text-[10px] font-medium opacity-80">
              {timeLabel}
            </span>
          )}
        </div>

        {room && (
          <p className="truncate text-[10px] leading-snug opacity-90">
            <span className="font-medium opacity-70">{t('leads.roomPreference')}:</span> {room}
          </p>
        )}

        {phone && (
          <p className="truncate font-mono text-[10px] leading-snug opacity-90">
            <span className="font-sans font-medium opacity-70">{t('leads.phone')}:</span> {phone}
          </p>
        )}
      </div>
    </button>
  );
}
