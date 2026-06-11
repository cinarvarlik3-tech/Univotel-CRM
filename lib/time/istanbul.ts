/**
 * Istanbul timezone utilities.
 * Istanbul is UTC+3 year-round (TRT — no DST).
 */

const TZ = 'Europe/Istanbul';

/** Returns YYYY-MM-DD string for the current date in Istanbul time. */
function istanbulDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Returns the start and end of the current calendar day in Istanbul time as UTC Date objects.
 * "Today" is the Istanbul calendar day — overnight work past midnight rolls into the next day.
 */
export function istanbulTodayBounds(now = new Date()): { start: Date; end: Date } {
  const dateStr = istanbulDateString(now);
  return {
    start: new Date(`${dateStr}T00:00:00+03:00`),
    end: new Date(`${dateStr}T23:59:59.999+03:00`),
  };
}

/**
 * Returns the start of the Monday of the current ISO week in Istanbul time.
 * Week = Monday-start, scoped to Istanbul calendar.
 */
export function istanbulWeekStart(now = new Date()): Date {
  const dateStr = istanbulDateString(now);
  const monday = new Date(`${dateStr}T00:00:00+03:00`);
  const dow = monday.getDay(); // 0=Sun, 1=Mon, …
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

/**
 * Returns the end of Sunday of the current ISO week in Istanbul time.
 */
export function istanbulWeekEnd(now = new Date()): Date {
  const start = istanbulWeekStart(now);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return end;
}
