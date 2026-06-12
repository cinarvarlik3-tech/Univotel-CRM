/**
 * Agenda (list) view — the revamped list layout.
 * Events are sorted by start and grouped under date headings, with rich rows.
 */
import { format } from 'date-fns';
import { IconCalendarEvent, IconClock } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { accentDotClasses, dateFnsLocale } from './calendar-utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { CalendarEvent, CalendarEventStyle } from './types';

interface AgendaViewProps {
  events: CalendarEvent[];
  locale: string;
  eventStyle?: CalendarEventStyle;
  emptyMessage: string;
  onEventClick: (event: CalendarEvent) => void;
}

/**
 * Renders the grouped agenda list.
 * @param props - Events, locale, empty-state copy, and click handler.
 * @returns Agenda list card.
 */
export function AgendaView({
  events,
  locale,
  eventStyle = 'chip',
  emptyMessage,
  onEventClick,
}: AgendaViewProps) {
  const { t } = useTranslation();
  const fnsLocale = dateFnsLocale(locale);
  const showCardFields = eventStyle === 'card';
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  const groups = new Map<string, { date: Date; items: CalendarEvent[] }>();
  for (const event of sorted) {
    const key = format(event.start, 'yyyy-MM-dd');
    const existing = groups.get(key);
    if (existing) existing.items.push(event);
    else groups.set(key, { date: event.start, items: [event] });
  }

  if (sorted.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <IconCalendarEvent className="size-8 text-text-tertiary" />
        <p className="text-sm text-text-secondary">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups.values()].map(({ date, items }) => (
        <div key={date.toISOString()} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2 px-1">
            <h3 className="font-heading text-sm font-semibold text-text-primary">
              {format(date, 'EEEE, d MMMM', { locale: fnsLocale })}
            </h3>
            <span className="text-xs text-text-tertiary">
              {format(date, 'yyyy', { locale: fnsLocale })}
            </span>
          </div>

          <Card className="divide-y divide-border-default p-0">
            {items.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick(event)}
                className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-row-hover"
              >
                <span
                  className={cn(
                    'mt-1.5 size-2.5 shrink-0 rounded-full',
                    accentDotClasses(event.accent),
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-text-primary group-hover:text-brand-blue">
                      {event.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {event.badges?.map((b) => (
                        <Badge key={`${b.label}-${b.variant}`} variant={b.variant}>
                          {b.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {event.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-text-secondary">{event.subtitle}</p>
                  )}
                  {showCardFields && event.cardDetails?.roomPreference && (
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {t('leads.roomPreference')}: {event.cardDetails.roomPreference}
                    </p>
                  )}
                  {showCardFields && event.cardDetails?.phone && (
                    <p className="mt-0.5 truncate font-mono text-xs text-text-secondary">
                      {t('leads.phone')}: {event.cardDetails.phone}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
                    <IconClock className="size-3.5" />
                    <span>
                      {event.allDay
                        ? format(event.start, 'd MMM yyyy', { locale: fnsLocale })
                        : format(event.start, 'HH:mm', { locale: fnsLocale })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
