/**
 * Full-width rectangular visit card for calendar grid cells.
 * Shows lead name, property/gender pills, room preference, phone, and action buttons.
 */
import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTimeOnly } from '@/lib/i18n/format-date';
import type { Locale } from '@/lib/i18n/types';
import { accentChipClasses } from './calendar-utils';
import type { CalendarEvent } from './types';

interface VisitEventCardProps {
  event: CalendarEvent;
  locale: string;
  /** Stretch card to fill its parent grid cell. */
  fill?: boolean;
  onClick: (event: CalendarEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
  renderEventActions?: (event: CalendarEvent) => ReactNode;
}

/**
 * Renders a visit as a rectangular card with lead details and inline actions.
 * @param props - Event data, locale, fill mode, and interaction handlers.
 * @returns Draggable visit card.
 */
export function VisitEventCard({
  event,
  locale,
  fill = false,
  onClick,
  onDragStart,
  onDragEnd,
  renderEventActions,
}: VisitEventCardProps) {
  const { t } = useTranslation();
  const draggable = Boolean(event.draggable && onDragStart);
  const timeLabel = event.allDay ? null : formatTimeOnly(event.start, locale as Locale);
  const phone = event.cardDetails?.phone;
  const room = event.cardDetails?.roomPreference;
  const propertyName = event.cardDetails?.propertyName;
  const genderLabel = event.cardDetails?.genderLabel;
  const showActions = Boolean(renderEventActions && event.visitStatus === 'scheduled');
  const hasPills = Boolean(propertyName || genderLabel);

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-col overflow-hidden rounded-md border border-border-default text-left shadow-sm',
        accentChipClasses(event.accent),
        fill ? 'h-full flex-1' : 'min-h-[72px] flex-1',
      )}
    >
      <button
        type="button"
        draggable={draggable}
        onDragStart={() => onDragStart?.(event)}
        onDragEnd={onDragEnd}
        onClick={() => onClick(event)}
        className={cn(
          'flex w-full min-h-0 flex-1 flex-col gap-0.5 px-2 pb-1 pt-1.5 text-left transition-shadow hover:shadow-md',
          draggable && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight">
            {event.title}
          </p>
          {timeLabel && (
            <span className="shrink-0 font-mono text-[10px] font-medium opacity-80">
              {timeLabel}
            </span>
          )}
        </div>

        {hasPills && (
          <div className="flex flex-wrap gap-1">
            {propertyName && (
              <Badge variant="secondary" className="max-w-full truncate px-1.5 py-0 text-[9px]">
                {propertyName}
              </Badge>
            )}
            {genderLabel && (
              <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                {genderLabel}
              </Badge>
            )}
          </div>
        )}

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
      </button>

      {showActions && (
        <div
          className="flex w-full shrink-0 flex-wrap gap-1 border-t border-black/10 px-2 pb-1.5 pt-1 [&_button]:h-7 [&_button]:px-2 [&_button]:text-[10px]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {renderEventActions!(event)}
        </div>
      )}
    </div>
  );
}
