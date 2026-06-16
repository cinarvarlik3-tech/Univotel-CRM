/**
 * Locale-aware relative time formatter for lead dwell pills (D13).
 * Produces Turkish strings like "3 gün önce", "az önce", "2 saat önce".
 * Day boundaries are anchored to Europe/Istanbul midnight.
 */
import { istanbulCalendarDay } from '@/lib/i18n/format-date';

/** Whole calendar days between two instants in Istanbul time. */
function istanbulDayDiff(earlier: Date, later: Date): number {
  const earlierDay = istanbulCalendarDay(earlier);
  const laterDay = istanbulCalendarDay(later);
  const earlierMs = new Date(`${earlierDay}T12:00:00+03:00`).getTime();
  const laterMs = new Date(`${laterDay}T12:00:00+03:00`).getTime();
  return Math.round((laterMs - earlierMs) / 86_400_000);
}

/**
 * Formats a past timestamp as a human-readable Turkish relative string.
 * Used for the "last-contact age" pill on lead rows and slide-over header.
 * @param date - The past timestamp.
 * @param now - Reference time (defaults to current instant).
 * @returns Relative time string in Turkish.
 */
export function formatRelativeTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'az önce';

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = istanbulDayDiff(date, now);

  if (diffMinutes < 2) return 'az önce';
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays === 1) return 'dün';
  if (diffDays < 30) return `${diffDays} gün önce`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} ay önce`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} yıl önce`;
}
