/**
 * Pure helpers for bucketing timestamps into Istanbul calendar days.
 * Used by the manager panel trend charts (lib/analytics/manager-panel.ts).
 * No IO — fully unit-testable.
 */

const TZ = 'Europe/Istanbul';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the YYYY-MM-DD key for a date in Istanbul time.
 * @param date - Any Date (UTC internally).
 * @returns Istanbul-local calendar day string.
 */
export function istanbulDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Enumerates every Istanbul calendar day between two instants (inclusive).
 * @param from - Range start.
 * @param to - Range end.
 * @returns Ordered list of YYYY-MM-DD day keys.
 */
export function enumerateIstanbulDays(from: Date, to: Date): string[] {
  const days: string[] = [];
  const lastKey = istanbulDayKey(to);
  // Istanbul is UTC+3 year-round (no DST), so stepping 24h from the range
  // start always lands on consecutive Istanbul days.
  let cursor = new Date(`${istanbulDayKey(from)}T00:00:00+03:00`);

  // Guard against inverted ranges.
  if (cursor.getTime() > to.getTime() && istanbulDayKey(cursor) !== lastKey) return days;

  for (let i = 0; i < 400; i++) {
    const key = istanbulDayKey(cursor);
    days.push(key);
    if (key === lastKey) break;
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return days;
}

/**
 * Counts timestamps per Istanbul day, aligned to a pre-enumerated day axis.
 * Timestamps falling outside the axis are ignored.
 * @param timestamps - ISO timestamp strings.
 * @param days - Day axis from enumerateIstanbulDays.
 * @returns Count per day, same order/length as days.
 */
export function bucketByIstanbulDay(timestamps: ReadonlyArray<string>, days: string[]): number[] {
  const index = new Map<string, number>();
  days.forEach((day, i) => index.set(day, i));

  const counts = new Array<number>(days.length).fill(0);
  for (const ts of timestamps) {
    const date = new Date(ts);
    if (isNaN(date.getTime())) continue;
    const i = index.get(istanbulDayKey(date));
    if (i !== undefined) counts[i] += 1;
  }
  return counts;
}
