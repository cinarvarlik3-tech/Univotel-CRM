/**
 * Locale-aware date and number formatting for CRM UI.
 * Timestamps are displayed in Europe/Istanbul (display layer only — DB values unchanged).
 */
import { ISTANBUL_TIMEZONE } from '@/lib/constants';
import type { Locale } from '@/lib/i18n/types';
import { localeToBcp47 } from '@/lib/i18n/types';
import { en } from '@/lib/i18n/messages/en';
import { tr } from '@/lib/i18n/messages/tr';
import { createTranslator } from '@/lib/i18n/create-translator';

/** Shared Intl options for datetime display (dd/mm/yyyy, 24h, Istanbul). */
const ISTANBUL_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: ISTANBUL_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

/** Shared Intl options for date-only display (dd/mm/yyyy, Istanbul). */
const ISTANBUL_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: ISTANBUL_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

/** Returns YYYY-MM-DD for a Date interpreted in Istanbul. */
export function istanbulCalendarDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Formats an ISO timestamp for display in lists and detail views.
 * @param iso - ISO date string.
 * @param locale - Active UI locale.
 */
export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(localeToBcp47(locale), ISTANBUL_DATETIME_OPTIONS);
}

/**
 * Formats a calendar date (DATE column or YYYY-MM-DD string) for display.
 * @param value - DATE string or ISO timestamp.
 * @param locale - Active UI locale.
 */
export function formatDateOnly(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(localeToBcp47(locale), ISTANBUL_DATE_OPTIONS);
}

/**
 * Formats time-of-day only (24h, Istanbul) from an ISO timestamp.
 * @param iso - ISO timestamp string.
 * @param locale - Active UI locale.
 */
export function formatTimeOnly(iso: string | Date, locale: Locale): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(localeToBcp47(locale), {
    timeZone: ISTANBUL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formats a number with locale grouping.
 * @param value - Numeric value.
 * @param locale - Active UI locale.
 */
export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(localeToBcp47(locale));
}

/**
 * Formats chat message time (hours and minutes, Istanbul 24h).
 * @param iso - ISO timestamp string.
 * @param locale - Active UI locale.
 */
export function formatChatMessageTime(iso: string, locale: Locale): string {
  return formatTimeOnly(iso, locale);
}

/**
 * Formats date separator labels in chat threads (Istanbul calendar days).
 * @param iso - ISO timestamp string.
 * @param locale - Active UI locale.
 */
export function formatChatDateSeparator(iso: string, locale: Locale): string {
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);

  const date = new Date(iso);
  const todayStr = istanbulCalendarDay(new Date());
  const dateStr = istanbulCalendarDay(date);

  const yesterday = new Date(`${todayStr}T12:00:00+03:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = istanbulCalendarDay(yesterday);

  if (dateStr === todayStr) return t('chat.today');
  if (dateStr === yesterdayStr) return t('chat.yesterday');

  return date.toLocaleDateString(localeToBcp47(locale), {
    timeZone: ISTANBUL_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Returns true when two ISO timestamps fall on different Istanbul calendar days.
 * @param a - First ISO timestamp.
 * @param b - Second ISO timestamp.
 */
export function isDifferentChatDay(a: string, b: string): boolean {
  return istanbulCalendarDay(new Date(a)) !== istanbulCalendarDay(new Date(b));
}

/**
 * Formats yes/no/null for display in lead summary fields.
 * @param value - Boolean or null.
 * @param locale - Active UI locale.
 */
export function formatYesNo(value: boolean | null | undefined, locale: Locale): string {
  if (value == null) return '—';
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);
  return value ? t('common.yes') : t('common.no');
}
