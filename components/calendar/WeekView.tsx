/**
 * Week view — Monday-first 7-day columns with an all-day row and an hourly grid.
 * All-day row cells and hour cells are drop targets for drag-to-reschedule.
 */
import { format, isSameDay } from 'date-fns';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CellEventList } from './CellEventList';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  buildHours,
  buildWeekDays,
  dateFnsLocale,
} from './calendar-utils';
import type { ReactNode } from 'react';
import type { CalendarEvent, CalendarEventStyle } from './types';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  locale: string;
  eventStyle?: CalendarEventStyle;
  onEventClick: (event: CalendarEvent) => void;
  onDragStart: (event: CalendarEvent) => void;
  onDragEnd: () => void;
  onDropOnDay: (day: Date) => void;
  onDropOnHour: (day: Date, hour: number) => void;
  renderEventActions?: (event: CalendarEvent) => ReactNode;
}

/** Clamps an event's hour into the visible [start, end) grid range. */
function visibleHour(date: Date): number {
  const h = date.getHours();
  if (h < DAY_START_HOUR) return DAY_START_HOUR;
  if (h >= DAY_END_HOUR) return DAY_END_HOUR - 1;
  return h;
}

/**
 * Renders the week grid.
 * @param props - Current week, events, locale, and DnD handlers.
 * @returns Week calendar card.
 */
export function WeekView({
  currentDate,
  events,
  locale,
  eventStyle = 'chip',
  onEventClick,
  onDragStart,
  onDragEnd,
  onDropOnDay,
  onDropOnHour,
  renderEventActions,
}: WeekViewProps) {
  const fnsLocale = dateFnsLocale(locale);
  const days = buildWeekDays(currentDate);
  const hours = buildHours();
  const today = new Date();
  const isCard = eventStyle === 'card';

  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  return (
    <Card className="overflow-hidden p-0">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border-default bg-muted/40">
        <div className="border-r border-border-default" />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className="border-r border-border-default px-1 py-2 text-center last:border-r-0"
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                {format(day, 'EEE', { locale: fnsLocale })}
              </div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-sm',
                  isToday && 'bg-brand-blue font-semibold text-primary-foreground',
                )}
              >
                {format(day, 'd', { locale: fnsLocale })}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border-default">
        <div className="flex items-center justify-end border-r border-border-default px-2 py-1 text-[10px] uppercase text-text-tertiary">
          —
        </div>
        {days.map((day) => {
          const cellEvents = allDayEvents.filter((e) => isSameDay(e.start, day));
          return (
            <div
              key={`allday-${day.toISOString()}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropOnDay(day)}
              className={cn(
                'relative flex flex-col gap-0.5 border-r border-border-default p-0.5 last:border-r-0 hover:bg-row-hover',
                isCard ? 'min-h-[56px]' : 'min-h-[34px] gap-1 p-1',
              )}
            >
              <CellEventList
                cellEvents={cellEvents}
                locale={locale}
                eventStyle={eventStyle}
                onEventClick={onEventClick}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                renderEventActions={renderEventActions}
              />
            </div>
          );
        })}
      </div>

      {/* Hourly grid */}
      <div className="max-h-[560px] overflow-y-auto">
        {hours.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border-default last:border-b-0"
          >
            <div className="border-r border-border-default px-2 py-1 text-right text-[10px] text-text-tertiary">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {days.map((day) => {
              const cellEvents = timedEvents.filter(
                (e) => isSameDay(e.start, day) && visibleHour(e.start) === hour,
              );
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropOnHour(day, hour)}
                  className={cn(
                    'relative flex flex-col gap-0.5 border-r border-border-default p-0.5 last:border-r-0 hover:bg-row-hover',
                    isCard ? 'min-h-[80px]' : 'min-h-[48px] gap-1 p-1',
                  )}
                >
                  <CellEventList
                    cellEvents={cellEvents}
                    locale={locale}
                    eventStyle={eventStyle}
                    onEventClick={onEventClick}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    renderEventActions={renderEventActions}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
