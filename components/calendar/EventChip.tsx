/**
 * Calendar event renderer — compact chip (default) or full-width visit card.
 * Dispatches to VisitEventCard when `style` is `card`.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconClock, IconGripVertical } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { accentChipClasses, accentDotClasses, dateFnsLocale } from './calendar-utils';
import { VisitEventCard } from './VisitEventCard';
import type { CalendarEvent, CalendarEventStyle } from './types';

interface EventChipProps {
  event: CalendarEvent;
  locale: string;
  style?: CalendarEventStyle;
  size?: 'compact' | 'block';
  /** Stretch card to fill the parent grid cell (week/day hour slots). */
  fill?: boolean;
  onClick: (event: CalendarEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
  onDragEnd?: () => void;
}

/**
 * Renders an event chip; on hover it reveals a richer preview popover.
 * @param props - Event data, active locale, size variant, and handlers.
 * @returns Interactive event chip element.
 */
export function EventChip({
  event,
  locale,
  style = 'chip',
  size = 'compact',
  fill = false,
  onClick,
  onDragStart,
  onDragEnd,
}: EventChipProps) {
  const [hovered, setHovered] = useState(false);

  if (style === 'card') {
    return (
      <VisitEventCard
        event={event}
        locale={locale}
        fill={fill}
        onClick={onClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );
  }

  const draggable = Boolean(event.draggable && onDragStart);
  const fnsLocale = dateFnsLocale(locale);
  const timeLabel = event.allDay ? null : format(event.start, 'HH:mm', { locale: fnsLocale });

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        draggable={draggable}
        onDragStart={() => onDragStart?.(event)}
        onDragEnd={onDragEnd}
        onClick={() => onClick(event)}
        className={cn(
          'flex w-full items-center gap-1 rounded-[5px] px-1.5 text-left transition-all',
          'hover:shadow-sm',
          accentChipClasses(event.accent),
          size === 'compact' ? 'py-[3px] text-[11px]' : 'py-1 text-xs',
          draggable && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {draggable && size === 'block' && (
          <IconGripVertical className="size-3 shrink-0 opacity-40" />
        )}
        {timeLabel && (
          <span className="shrink-0 font-mono text-[10px] opacity-80">{timeLabel}</span>
        )}
        <span className="truncate font-medium">{event.title}</span>
      </button>

      {hovered && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 animate-in fade-in slide-in-from-top-1 duration-150">
          <Card className="border-border-strong p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-heading text-sm font-semibold leading-tight text-text-primary">
                {event.title}
              </h4>
              <span
                className={cn(
                  'mt-1 size-2.5 shrink-0 rounded-full',
                  accentDotClasses(event.accent),
                )}
              />
            </div>
            {event.subtitle && (
              <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{event.subtitle}</p>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
              <IconClock className="size-3.5" />
              <span>
                {event.allDay
                  ? format(event.start, 'd MMM yyyy', { locale: fnsLocale })
                  : format(event.start, 'd MMM yyyy · HH:mm', { locale: fnsLocale })}
              </span>
            </div>
            {event.badges && event.badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {event.badges.map((b) => (
                  <Badge key={`${b.label}-${b.variant}`} variant={b.variant}>
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
