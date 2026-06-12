/**
 * Day view — a single day's all-day strip plus an hourly timeline.
 * Both the all-day strip and hour rows are drop targets for rescheduling.
 */
import { format, isSameDay } from 'date-fns';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CellEventList } from './CellEventList';
import { DAY_END_HOUR, DAY_START_HOUR, buildHours, dateFnsLocale } from './calendar-utils';
import type { CalendarEvent, CalendarEventStyle } from './types';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  locale: string;
  eventStyle?: CalendarEventStyle;
  onEventClick: (event: CalendarEvent) => void;
  onDragStart: (event: CalendarEvent) => void;
  onDragEnd: () => void;
  onDropOnDay: (day: Date) => void;
  onDropOnHour: (day: Date, hour: number) => void;
}

/** Clamps an event's hour into the visible [start, end) grid range. */
function visibleHour(date: Date): number {
  const h = date.getHours();
  if (h < DAY_START_HOUR) return DAY_START_HOUR;
  if (h >= DAY_END_HOUR) return DAY_END_HOUR - 1;
  return h;
}

/**
 * Renders the single-day timeline.
 * @param props - Current day, events, locale, and DnD handlers.
 * @returns Day calendar card.
 */
export function DayView({
  currentDate,
  events,
  locale,
  eventStyle = 'chip',
  onEventClick,
  onDragStart,
  onDragEnd,
  onDropOnDay,
  onDropOnHour,
}: DayViewProps) {
  const fnsLocale = dateFnsLocale(locale);
  const hours = buildHours();
  const dayEvents = events.filter((e) => isSameDay(e.start, currentDate));
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);
  const isCard = eventStyle === 'card';

  return (
    <Card className="overflow-hidden p-0">
      {/* All-day strip */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropOnDay(currentDate)}
        className="flex items-start gap-2 border-b border-border-default bg-muted/40 px-3 py-2"
      >
        <span className="w-14 shrink-0 pt-0.5 text-right text-[10px] uppercase text-text-tertiary">
          {format(currentDate, 'EEE', { locale: fnsLocale })}
        </span>
        <div className={cn('flex flex-1 flex-col gap-0.5', !isCard && 'gap-1')}>
          {allDayEvents.length === 0 ? (
            <span className="text-xs text-text-tertiary">—</span>
          ) : (
            <CellEventList
              cellEvents={allDayEvents}
              locale={locale}
              eventStyle={eventStyle}
              onEventClick={onEventClick}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          )}
        </div>
      </div>

      {/* Hourly timeline */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const cellEvents = timedEvents.filter((e) => visibleHour(e.start) === hour);
          return (
            <div
              key={hour}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropOnHour(currentDate, hour)}
              className={cn(
                'flex border-b border-border-default last:border-b-0 hover:bg-row-hover',
              )}
            >
              <div className="w-14 shrink-0 border-r border-border-default px-2 py-2 text-right text-[11px] text-text-tertiary">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div
                className={cn(
                  'relative flex flex-1 flex-col gap-0.5 p-0.5',
                  isCard ? 'min-h-[88px]' : 'min-h-[52px] gap-1 p-1.5',
                )}
              >
                <CellEventList
                  cellEvents={cellEvents}
                  locale={locale}
                  eventStyle={eventStyle}
                  onEventClick={onEventClick}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
