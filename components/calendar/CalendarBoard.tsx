/**
 * Reusable calendar board with Month / Week / Day / List (agenda) views.
 *
 * Domain-agnostic: callers pass `CalendarEvent`s, optional filter groups, and
 * handlers for click + reschedule. Drag-and-drop rescheduling always routes
 * through a confirmation dialog ("moving X from Y to Z") before persisting.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { addDays, addMonths, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns';
import {
  IconCalendarEvent,
  IconCalendarMonth,
  IconCalendarWeek,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconList,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { AgendaView } from './AgendaView';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { WEEK_STARTS_ON, dateFnsLocale } from './calendar-utils';
import type { CalendarEvent, CalendarEventStyle, CalendarFilterGroup, CalendarView } from './types';

interface CalendarBoardProps {
  events: CalendarEvent[];
  loading?: boolean;
  defaultView?: CalendarView;
  /** `card` renders full-width visit cards; `chip` is the compact default. */
  eventStyle?: CalendarEventStyle;
  filterGroups?: CalendarFilterGroup[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Extra controls rendered on the toolbar's right side (e.g. a create button). */
  actions?: ReactNode;
  onEventClick: (event: CalendarEvent) => void;
  /**
   * Persists a reschedule after the user confirms. Return true on success.
   * When omitted, events are not draggable.
   */
  onReschedule?: (event: CalendarEvent, newStart: Date) => Promise<boolean>;
  /** Optional per-event action buttons (list view, etc.). */
  renderEventActions?: (event: CalendarEvent) => ReactNode;
}

const VIEW_ORDER: CalendarView[] = ['month', 'week', 'day', 'list'];
const VIEW_ICON = {
  month: IconCalendarMonth,
  week: IconCalendarWeek,
  day: IconCalendarEvent,
  list: IconList,
} as const;

/**
 * Computes a reschedule target date from a drop on a day (optionally an hour).
 * All-day events keep their all-day nature; timed events adopt the dropped hour
 * (or keep their original time when dropped on a day cell).
 * @param event - The dragged event.
 * @param day - Target day.
 * @param hour - Optional target hour (week/day grids).
 * @returns The proposed new start Date.
 */
function computeNewStart(event: CalendarEvent, day: Date, hour?: number): Date {
  const next = new Date(day);
  if (event.allDay) {
    next.setHours(0, 0, 0, 0);
  } else if (hour !== undefined) {
    next.setHours(hour, 0, 0, 0);
  } else {
    next.setHours(event.start.getHours(), event.start.getMinutes(), 0, 0);
  }
  return next;
}

/**
 * Returns true when two starts are effectively identical for this event type.
 * @param event - The event (its allDay flag controls granularity).
 * @param a - First date.
 * @param b - Second date.
 */
function sameSlot(event: CalendarEvent, a: Date, b: Date): boolean {
  if (event.allDay) return isSameDay(a, b);
  return a.getTime() === b.getTime();
}

/**
 * The main calendar board component.
 * @param props - Events, view config, filters, and handlers.
 * @returns Calendar UI with toolbar, filter bar, view, and confirm dialog.
 */
export function CalendarBoard({
  events,
  loading = false,
  defaultView = 'month',
  eventStyle = 'chip',
  filterGroups = [],
  searchPlaceholder,
  emptyMessage,
  actions,
  onEventClick,
  onReschedule,
  renderEventActions,
}: CalendarBoardProps) {
  const { t, locale } = useTranslation();
  const fnsLocale = dateFnsLocale(locale);

  const [view, setView] = useState<CalendarView>(defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [pending, setPending] = useState<{ event: CalendarEvent; newStart: Date } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeFilterCount = Object.values(selectedFilters).reduce((n, v) => n + v.length, 0);
  const hasActiveFilters = activeFilterCount > 0 || search.trim().length > 0;

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (query) {
        const haystack = [
          event.title,
          event.subtitle ?? '',
          event.cardDetails?.phone ?? '',
          event.cardDetails?.roomPreference ?? '',
          ...(event.badges?.map((b) => b.label) ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      for (const [key, values] of Object.entries(selectedFilters)) {
        if (values.length === 0) continue;
        const eventValue = event.filterValues?.[key];
        if (!eventValue || !values.includes(eventValue)) return false;
      }
      return true;
    });
  }, [events, search, selectedFilters]);

  /** Steps the visible range forward/backward depending on the active view. */
  function navigate(direction: 1 | -1) {
    setCurrentDate((prev) => {
      if (view === 'month') return addMonths(prev, direction);
      if (view === 'week') return addDays(prev, direction * 7);
      return addDays(prev, direction);
    });
  }

  /** Toggles a filter option on/off within its group. */
  function toggleFilter(key: string, value: string, checked: boolean) {
    setSelectedFilters((prev) => {
      const current = prev[key] ?? [];
      const next = checked ? [...current, value] : current.filter((v) => v !== value);
      return { ...prev, [key]: next };
    });
  }

  /** Clears every filter and the search box. */
  function clearFilters() {
    setSelectedFilters({});
    setSearch('');
  }

  /** Requests a reschedule (opens the confirm dialog) unless it's a no-op. */
  function requestReschedule(day: Date, hour?: number) {
    const event = draggedEvent;
    setDraggedEvent(null);
    if (!event || !onReschedule) return;
    const newStart = computeNewStart(event, day, hour);
    if (sameSlot(event, event.start, newStart)) return;
    setSaveError(null);
    setPending({ event, newStart });
  }

  /** Confirms the pending reschedule and persists it via the caller's handler. */
  async function confirmReschedule() {
    if (!pending || !onReschedule) return;
    setSaving(true);
    setSaveError(null);
    let ok = false;
    try {
      ok = await onReschedule(pending.event, pending.newStart);
    } catch {
      ok = false;
    }
    setSaving(false);
    if (ok) setPending(null);
    else setSaveError(t('calendar.rescheduleFailed'));
  }

  /** Formats a date for the confirm dialog, respecting all-day vs timed events. */
  function formatSlot(event: CalendarEvent, date: Date): string {
    return event.allDay
      ? format(date, 'd MMM yyyy', { locale: fnsLocale })
      : format(date, 'd MMM yyyy · HH:mm', { locale: fnsLocale });
  }

  const rangeLabel = useMemo(() => {
    if (view === 'month') return format(currentDate, 'LLLL yyyy', { locale: fnsLocale });
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
      const end = endOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
      return `${format(start, 'd MMM', { locale: fnsLocale })} – ${format(end, 'd MMM yyyy', { locale: fnsLocale })}`;
    }
    if (view === 'day') return format(currentDate, 'EEEE, d MMMM yyyy', { locale: fnsLocale });
    return t('calendar.allEvents');
  }, [view, currentDate, fnsLocale, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-semibold text-text-primary">{rangeLabel}</h2>
          {view !== 'list' && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-8" onClick={() => navigate(-1)}>
                <IconChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                {t('calendar.today')}
              </Button>
              <Button variant="outline" size="icon" className="size-8" onClick={() => navigate(1)}>
                <IconChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-card p-1">
            {VIEW_ORDER.map((v) => {
              const Icon = VIEW_ICON[v];
              return (
                <Button
                  key={v}
                  variant={view === v ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7"
                  onClick={() => setView(v)}
                >
                  <Icon className="size-4" />
                  <span className="ml-1 hidden sm:inline">{t(`calendar.view_${v}`)}</span>
                </Button>
              );
            })}
          </div>
          {actions}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder ?? t('calendar.searchPlaceholder')}
            className="h-9 w-full rounded-lg border border-border-strong bg-surface-card pl-9 pr-9 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <IconX className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterGroups.map((group) => {
            const selected = selectedFilters[group.key] ?? [];
            return (
              <DropdownMenu key={group.key}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <IconFilter className="size-4" />
                    {group.label}
                    {selected.length > 0 && (
                      <Badge variant="default" className="ml-1">
                        {selected.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {group.options.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={selected.includes(option.value)}
                      onCheckedChange={(checked) =>
                        toggleFilter(group.key, option.value, Boolean(checked))
                      }
                      onSelect={(e) => e.preventDefault()}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <IconX className="size-4" />
              {t('calendar.clearFilters')}
            </Button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-secondary">{t('calendar.activeFilters')}</span>
          {filterGroups.flatMap((group) =>
            (selectedFilters[group.key] ?? []).map((value) => {
              const option = group.options.find((o) => o.value === value);
              return (
                <Badge key={`${group.key}-${value}`} variant="secondary" className="gap-1">
                  {option?.label ?? value}
                  <button
                    type="button"
                    onClick={() => toggleFilter(group.key, value, false)}
                    className="hover:text-text-primary"
                  >
                    <IconX className="size-3" />
                  </button>
                </Badge>
              );
            }),
          )}
        </div>
      )}

      {/* Views */}
      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-[10px]" />
      ) : view === 'month' ? (
        <MonthView
          currentDate={currentDate}
          events={filteredEvents}
          locale={locale}
          eventStyle={eventStyle}
          onEventClick={onEventClick}
          onDragStart={setDraggedEvent}
          onDragEnd={() => setDraggedEvent(null)}
          onDropOnDay={(day) => requestReschedule(day)}
          renderEventActions={renderEventActions}
        />
      ) : view === 'week' ? (
        <WeekView
          currentDate={currentDate}
          events={filteredEvents}
          locale={locale}
          eventStyle={eventStyle}
          onEventClick={onEventClick}
          onDragStart={setDraggedEvent}
          onDragEnd={() => setDraggedEvent(null)}
          onDropOnDay={(day) => requestReschedule(day)}
          onDropOnHour={(day, hour) => requestReschedule(day, hour)}
          renderEventActions={renderEventActions}
        />
      ) : view === 'day' ? (
        <DayView
          currentDate={currentDate}
          events={filteredEvents}
          locale={locale}
          eventStyle={eventStyle}
          onEventClick={onEventClick}
          onDragStart={setDraggedEvent}
          onDragEnd={() => setDraggedEvent(null)}
          onDropOnDay={(day) => requestReschedule(day)}
          onDropOnHour={(day, hour) => requestReschedule(day, hour)}
          renderEventActions={renderEventActions}
        />
      ) : (
        <AgendaView
          events={filteredEvents}
          locale={locale}
          eventStyle={eventStyle}
          emptyMessage={emptyMessage ?? t('calendar.noEvents')}
          onEventClick={onEventClick}
          renderEventActions={renderEventActions}
        />
      )}

      {/* Reschedule confirmation */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('calendar.rescheduleConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {pending &&
                t('calendar.rescheduleConfirmBody', {
                  title: pending.event.title,
                  from: formatSlot(pending.event, pending.event.start),
                  to: formatSlot(pending.event, pending.newStart),
                })}
            </DialogDescription>
          </DialogHeader>
          {saveError && <p className="text-xs text-brand-red">{saveError}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void confirmReschedule()} disabled={saving}>
              {saving ? t('common.saving') : t('calendar.rescheduleConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
