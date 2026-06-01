/**
 * Locale-aware date and number formatting for CRM UI.
 */
import type { Locale } from '@/lib/i18n/types';
import { localeToBcp47 } from '@/lib/i18n/types';
import { en } from '@/lib/i18n/messages/en';
import { tr } from '@/lib/i18n/messages/tr';
import { createTranslator } from '@/lib/i18n/create-translator';

/**
 * Formats an ISO timestamp for display in lists and detail views.
 * @param iso - ISO date string.
 * @param locale - Active UI locale.
 */
export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(localeToBcp47(locale));
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
 * Formats chat message time (hours and minutes).
 * @param iso - ISO timestamp string.
 * @param locale - Active UI locale.
 */
export function formatChatMessageTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(localeToBcp47(locale), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats date separator labels in chat threads.
 * @param iso - ISO timestamp string.
 * @param locale - Active UI locale.
 */
export function formatChatDateSeparator(iso: string, locale: Locale): string {
  const messages = locale === 'tr' ? tr : en;
  const t = createTranslator(messages);

  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return t('chat.today');
  if (sameDay(date, yesterday)) return t('chat.yesterday');

  return date.toLocaleDateString(localeToBcp47(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Returns true when two ISO timestamps fall on different calendar days.
 * @param a - First ISO timestamp.
 * @param b - Second ISO timestamp.
 */
export function isDifferentChatDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
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
