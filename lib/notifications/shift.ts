/**
 * Salesperson shift-hours gate for notifications.
 * No notification is sent outside the salesperson's configured shift, evaluated
 * in Istanbul local time (same timezone basis as SLA business hours).
 */
import { ISTANBUL_TIMEZONE } from '@/lib/constants';
import { toZonedTime } from 'date-fns-tz';

/**
 * Parses an 'HH:MM' or 'HH:MM:SS' time string to minutes-since-midnight.
 * @param time - Time string from salespeople.shift_start/shift_end.
 * @returns Minutes since midnight, or null when unparseable.
 */
function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/**
 * Returns the current minute-of-day in Istanbul local time.
 * @param now - Instant to evaluate.
 */
function getIstanbulMinutes(now: Date): number {
  const istanbul = toZonedTime(now, ISTANBUL_TIMEZONE);
  return istanbul.getHours() * 60 + istanbul.getMinutes();
}

/**
 * Returns whether the given instant falls within a salesperson's shift.
 * Handles overnight shifts where shift_end is earlier than shift_start (wraps midnight).
 * When either bound is missing/unparseable the gate is open (returns true) so that a
 * misconfigured shift never silently swallows every notification.
 * @param shiftStart - salespeople.shift_start ('HH:MM' Istanbul local).
 * @param shiftEnd - salespeople.shift_end ('HH:MM' Istanbul local).
 * @param now - Instant to evaluate; defaults to current time.
 */
export function isWithinShift(
  shiftStart: string | null | undefined,
  shiftEnd: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const start = parseTimeToMinutes(shiftStart);
  const end = parseTimeToMinutes(shiftEnd);
  if (start === null || end === null) return true;

  const current = getIstanbulMinutes(now);

  if (start === end) {
    // Zero-length or 24h shift — treat as always-on to avoid silently blocking.
    return true;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  // Overnight shift (e.g. 22:00–06:00): inside if before end OR at/after start.
  return current >= start || current < end;
}
