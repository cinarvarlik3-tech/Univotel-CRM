/**
 * Shared types for the reusable calendar (move-in & visit calendars).
 * The calendar is domain-agnostic: callers map their rows into `CalendarEvent`s
 * and supply filter groups + reschedule/click handlers.
 */
import type { BadgeProps } from '@/components/ui/badge';

/** The four calendar layouts. */
export type CalendarView = 'month' | 'week' | 'day' | 'list';

/** Accent palette — maps onto the app's soft badge tokens (see calendar-utils). */
export type CalendarAccent = 'blue' | 'green' | 'amber' | 'red' | 'gray';

/** Variant union accepted by the shared Badge component. */
export type CalendarBadgeVariant = NonNullable<BadgeProps['variant']>;

/** A small status pill rendered on an event. */
export interface CalendarEventBadge {
  label: string;
  variant: CalendarBadgeVariant;
}

/** Optional extra lines shown on full-width visit cards. */
export interface CalendarEventCardDetails {
  /** Lead phone / contact number. */
  phone?: string | null;
  /** Room preference (e.g. joined room_type values). */
  roomPreference?: string | null;
}

/** How events are rendered inside grid cells. */
export type CalendarEventStyle = 'chip' | 'card';

/** A single calendar entry (a lead move-in or a scheduled visit). */
export interface CalendarEvent {
  /** Stable unique id for the event row. */
  id: string;
  /** Linked lead UUID — opened in the detail panel on click. */
  leadUuid?: string | null;
  /** Primary label (lead/contact name). */
  title: string;
  /** Optional secondary line (property, notes, actual date…). */
  subtitle?: string | null;
  /** Event start. For `allDay` events the time component is ignored. */
  start: Date;
  /** When true the event has no meaningful time-of-day (e.g. move-in dates). */
  allDay: boolean;
  /** Color accent. */
  accent: CalendarAccent;
  /** Status pills shown on hover / list / day views. */
  badges?: CalendarEventBadge[];
  /** Values keyed by filter-group key, used by the built-in filter bar. */
  filterValues?: Record<string, string | null | undefined>;
  /** When false the event cannot be dragged to reschedule. */
  draggable?: boolean;
  /** Rich fields for full-width card rendering (visit calendar). */
  cardDetails?: CalendarEventCardDetails;
}

/** A selectable option inside a filter dropdown. */
export interface CalendarFilterOption {
  value: string;
  label: string;
}

/** A filter dropdown definition (e.g. Status, Property). */
export interface CalendarFilterGroup {
  key: string;
  label: string;
  options: CalendarFilterOption[];
}
