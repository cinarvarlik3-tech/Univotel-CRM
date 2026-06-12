/**
 * Renders the events inside a single calendar grid cell.
 * Visit cards use fill layout when there is exactly one event in the slot.
 */
import { EventChip } from './EventChip';
import type { CalendarEvent, CalendarEventStyle } from './types';

interface CellEventListProps {
  cellEvents: CalendarEvent[];
  locale: string;
  eventStyle: CalendarEventStyle;
  onEventClick: (event: CalendarEvent) => void;
  onDragStart: (event: CalendarEvent) => void;
  onDragEnd: () => void;
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
}: CellEventListProps) {
  const useFill = eventStyle === 'card' && cellEvents.length === 1;

  return (
    <>
      {cellEvents.map((event) => (
        <EventChip
          key={event.id}
          event={event}
          locale={locale}
          style={eventStyle}
          size={eventStyle === 'chip' ? 'block' : undefined}
          fill={useFill}
          onClick={onEventClick}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </>
  );
}
