/**
 * Renders the events inside a single calendar grid cell.
 * Visit cards use fill layout when there is exactly one event in the slot.
 */
import { EventChip } from './EventChip';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CalendarEventStyle } from './types';

interface CellEventListProps {
  cellEvents: CalendarEvent[];
  locale: string;
  eventStyle: CalendarEventStyle;
  onEventClick: (event: CalendarEvent) => void;
  onDragStart: (event: CalendarEvent) => void;
  onDragEnd: () => void;
  renderEventActions?: (event: CalendarEvent) => React.ReactNode;
}

/**
 * Maps cell events to chips or full-width visit cards.
 * @param props - Events in the cell plus style and handlers.
 * @returns Fragment of event elements.
 */
export function CellEventList({
  cellEvents,
  locale,
  eventStyle,
  onEventClick,
  onDragStart,
  onDragEnd,
  renderEventActions,
}: CellEventListProps) {
  const useFill = eventStyle === 'card';

  return (
    <>
      {cellEvents.map((event) => (
        <div key={event.id} className={cn(useFill && 'flex min-h-0 flex-1 flex-col')}>
          <EventChip
            event={event}
            locale={locale}
            style={eventStyle}
            size={eventStyle === 'chip' ? 'block' : undefined}
            fill={useFill}
            onClick={onEventClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            renderEventActions={renderEventActions}
          />
        </div>
      ))}
    </>
  );
}
