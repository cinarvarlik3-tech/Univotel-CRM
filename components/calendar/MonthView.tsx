/**
 * Month grid view — 6 weeks × 7 days, Monday-first, with compact event chips.
 * Day cells are drop targets for drag-to-reschedule.
 */
import { format, isSameDay, isSameMonth } from 'date-fns';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EventChip } from './EventChip';
import { buildMonthGrid, buildWeekDays, dateFnsLocale, eventsForDay } from './calendar-utils';
import type { ReactNode } from 'react';
import type { CalendarEvent, CalendarEventStyle } from './types';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  locale: string;
  eventStyle?: CalendarEventStyle;
  onEventClick: (event: CalendarEvent) => void;
  onDragStart: (event: CalendarEvent) => void;
  onDragEnd: () => void;
  onDropOnDay: (day: Date) => void;
  renderEventActions?: (event: CalendarEvent) => ReactNode;
}

const MAX_VISIBLE_CHIP = 3;
const MAX_VISIBLE_CARD = 2;

/**
 * Renders the month grid.
 * @param props - Current month, events, locale, and DnD handlers.
 * @returns Month calendar card.
 */
export function MonthView({
  currentDate,
  events,
  locale,
  eventStyle = 'chip',
  onEventClick,
  onDragStart,
  onDragEnd,
  onDropOnDay,
  renderEventActions,
}: MonthViewProps) {
  const fnsLocale = dateFnsLocale(locale);
  const days = buildMonthGrid(currentDate);
  const weekdayNames = buildWeekDays(currentDate).map((d) =>
    format(d, 'EEE', { locale: fnsLocale }),
  );
  const today = new Date();
  const isCard = eventStyle === 'card';
  const maxVisible = isCard ? MAX_VISIBLE_CARD : MAX_VISIBLE_CHIP;

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-border-default bg-muted/40">
        {weekdayNames.map((name) => (
          <div
            key={name}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-text-secondary"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = eventsForDay(events, day);
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={index}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropOnDay(day)}
              className={cn(
                'flex flex-col gap-1 border-b border-r border-border-default p-1.5 transition-colors',
                isCard ? 'min-h-[148px]' : 'min-h-[104px]',
                index % 7 === 6 && 'border-r-0',
                index >= 35 && 'border-b-0',
                !inMonth && 'bg-muted/30',
                'hover:bg-row-hover',
              )}
            >
              <div
                className={cn(
                  'flex size-6 items-center justify-center self-end rounded-full text-xs',
                  isToday
                    ? 'bg-brand-blue font-semibold text-primary-foreground'
                    : inMonth
                      ? 'text-text-primary'
                      : 'text-text-tertiary',
                )}
              >
                {format(day, 'd', { locale: fnsLocale })}
              </div>

              <div className={cn('flex min-h-0 flex-1 flex-col gap-0.5', isCard && 'gap-1')}>
                {dayEvents.slice(0, maxVisible).map((event) => (
                  <div key={event.id} className={cn(isCard && 'flex min-h-0 flex-1 flex-col')}>
                    <EventChip
                      event={event}
                      locale={locale}
                      style={eventStyle}
                      fill={isCard}
                      onClick={onEventClick}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      renderEventActions={renderEventActions}
                    />
                  </div>
                ))}
                {dayEvents.length > maxVisible && (
                  <span className="px-1 text-[10px] font-medium text-text-tertiary">
                    +{dayEvents.length - maxVisible}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
