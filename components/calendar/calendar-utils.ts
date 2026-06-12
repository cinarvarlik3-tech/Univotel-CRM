/**
 * Date math + theming helpers for the reusable calendar.
 * Date logic is built on date-fns; all colors reference theme CSS variables.
 */
import { addDays, isSameDay, startOfWeek } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { CalendarAccent, CalendarEvent } from './types';

/** Weeks start on Monday across the app. */
export const WEEK_STARTS_ON = 1 as const;

/** First and last hour rendered in week/day time grids (inclusive start, exclusive end). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;

/**
 * Resolves the date-fns locale object for the active UI locale.
 * @param locale - 'tr' or 'en'.
 * @returns Matching date-fns locale.
 */
export function dateFnsLocale(locale: string): Locale {
  return locale === 'tr' ? tr : enUS;
}

/**
 * Builds the 42-cell (6×7) day grid covering the month of `date`.
 * @param date - Any date within the target month.
 * @returns Ordered array of 42 days (leading/trailing days included).
 */
export function buildMonthGrid(date: Date): Date[] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/**
 * Builds the 7 day columns for the week containing `date`.
 * @param date - Any date within the target week.
 * @returns Ordered array of 7 days starting Monday.
 */
export function buildWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Hour labels rendered in the week/day grids. */
export function buildHours(): number[] {
  return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
}

/**
 * Returns events whose start falls on the given calendar day.
 * @param events - All events.
 * @param day - Target day.
 * @returns Events on that day, sorted by start time.
 */
export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((e) => isSameDay(e.start, day))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Soft chip classes per accent — light fill, colored text, colored left rule. */
const ACCENT_CHIP: Record<CalendarAccent, string> = {
  blue: 'bg-[var(--badge-call-bg)] text-[var(--badge-call-text)] border-l-[3px] border-brand-blue',
  amber:
    'bg-[var(--badge-visit-bg)] text-[var(--badge-visit-text)] border-l-[3px] border-[color:var(--badge-visit-text)]',
  green:
    'bg-[var(--badge-deal-bg)] text-[var(--badge-deal-text)] border-l-[3px] border-[color:var(--badge-deal-text)]',
  red: 'bg-brand-red-light text-brand-red border-l-[3px] border-brand-red',
  gray: 'bg-muted text-text-secondary border-l-[3px] border-border-strong',
};

/** Solid dot classes per accent. */
const ACCENT_DOT: Record<CalendarAccent, string> = {
  blue: 'bg-brand-blue',
  amber: 'bg-[color:var(--badge-visit-text)]',
  green: 'bg-[color:var(--badge-deal-text)]',
  red: 'bg-brand-red',
  gray: 'bg-text-tertiary',
};

/**
 * Tailwind classes for an event chip background/text/border.
 * @param accent - The event accent.
 * @returns Class string.
 */
export function accentChipClasses(accent: CalendarAccent): string {
  return ACCENT_CHIP[accent];
}

/**
 * Tailwind classes for a small accent dot.
 * @param accent - The event accent.
 * @returns Class string.
 */
export function accentDotClasses(accent: CalendarAccent): string {
  return ACCENT_DOT[accent];
}
