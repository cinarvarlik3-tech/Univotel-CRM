/**
 * SLA deadline calculation based on Istanbul business hours and peak season settings.
 */
import {
  isPeakSeasonActive,
  ISTANBUL_TIMEZONE,
  PEAK_SEASON_SLA_MINUTES,
  SLA_BUSINESS_HOUR_END,
  SLA_BUSINESS_HOUR_START,
  SLA_DEADLINE_MINUTES,
} from '@/lib/constants';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

/** SLA calculation result with deadline timestamp. */
export interface SlaResult {
  deadline: Date;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function getIstanbulMinutes(date: Date): number {
  const istanbul = toZonedTime(date, ISTANBUL_TIMEZONE);
  return istanbul.getHours() * 60 + istanbul.getMinutes();
}

function istanbulInstantWithTime(reference: Date, hours: number, minutes: number): Date {
  const zoned = toZonedTime(reference, ISTANBUL_TIMEZONE);
  const target = new Date(zoned);
  target.setHours(hours, minutes, 0, 0);
  return fromZonedTime(target, ISTANBUL_TIMEZONE);
}

/**
 * Returns whether the given instant falls within SLA business hours (09:00–17:00 Istanbul).
 * @param now - Instant to evaluate; defaults to current time.
 */
export function isWithinSlaBusinessHours(now: Date = new Date()): boolean {
  const minutes = getIstanbulMinutes(now);
  const start = parseTimeToMinutes(SLA_BUSINESS_HOUR_START);
  const end = parseTimeToMinutes(SLA_BUSINESS_HOUR_END);
  return minutes >= start && minutes < end;
}

/**
 * Returns when SLA counting starts for a lead created at the given time.
 * Leads created before 09:00 defer to 09:00 the same day; after 17:00 defer to 09:00 the next day.
 * @param createdAt - Lead creation timestamp.
 */
export function getSlaStartTime(createdAt: Date): Date {
  const minutes = getIstanbulMinutes(createdAt);
  const startMinutes = parseTimeToMinutes(SLA_BUSINESS_HOUR_START);
  const endMinutes = parseTimeToMinutes(SLA_BUSINESS_HOUR_END);

  if (minutes >= startMinutes && minutes < endMinutes) {
    return createdAt;
  }

  const [startH, startM = 0] = SLA_BUSINESS_HOUR_START.split(':').map(Number);

  if (minutes < startMinutes) {
    return istanbulInstantWithTime(createdAt, startH, startM);
  }

  const zoned = toZonedTime(createdAt, ISTANBUL_TIMEZONE);
  const nextDay = new Date(zoned);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(startH, startM, 0, 0);
  return fromZonedTime(nextDay, ISTANBUL_TIMEZONE);
}

/**
 * Returns the number of Istanbul business hours (09:00–17:00) that have elapsed
 * since `ev`, relative to `now`. Mirrors the SQL `sla_business_hours_since` function.
 *
 * Cases covered:
 * - ev during today's business window → straight wall-clock diff
 * - ev in overnight gap (yesterday 17:00 – today 09:00) → count from today 09:00
 * - ev during yesterday's business window → carry from yesterday + today's elapsed
 * - ev older than yesterday 09:00 → return 99 (definitely breached)
 *
 * Assumes `now` is within business hours (the cron body guards this).
 * @param ev - The event timestamp to measure from.
 * @param now - Current time; defaults to new Date().
 * @returns Hours of business time elapsed (may exceed 2 before the cron fires again).
 */
export function slaBusinessHoursSince(ev: Date, now: Date = new Date()): number {
  const today09 = istanbulInstantWithTime(now, 9, 0);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yest09 = istanbulInstantWithTime(yesterday, 9, 0);
  const yest17 = istanbulInstantWithTime(yesterday, 17, 0);

  if (ev >= today09) {
    return (now.getTime() - ev.getTime()) / 3_600_000;
  } else if (ev >= yest17) {
    return (now.getTime() - today09.getTime()) / 3_600_000;
  } else if (ev >= yest09) {
    return (yest17.getTime() - ev.getTime() + now.getTime() - today09.getTime()) / 3_600_000;
  } else {
    return 99;
  }
}

/**
 * Calculates SLA deadline for a lead based on creation time and business hours.
 * SLA is 1 hour from the adjusted start time; tracking runs 09:00–17:00 Istanbul only.
 * @param _leadSource - Lead source (retained for call-site compatibility).
 * @param createdAt - Lead creation timestamp.
 * @returns SLA deadline date.
 */
export function calculateSlaDeadline(_leadSource: string, createdAt: Date): SlaResult {
  const deadlineMinutes = isPeakSeasonActive() ? PEAK_SEASON_SLA_MINUTES : SLA_DEADLINE_MINUTES;
  const slaStart = getSlaStartTime(createdAt);
  return {
    deadline: new Date(slaStart.getTime() + deadlineMinutes * 60 * 1000),
  };
}
