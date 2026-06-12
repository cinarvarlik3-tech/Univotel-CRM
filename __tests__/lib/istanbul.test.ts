/**
 * Unit tests for Istanbul timezone boundary helpers.
 * Istanbul is UTC+3 year-round (TRT, no DST).
 */
import { describe, expect, it } from 'vitest';
import { istanbulTodayBounds, istanbulWeekStart, istanbulWeekEnd } from '@/lib/time/istanbul';

// Reference: 2026-06-11 is a Thursday (day-of-week = 4).
// ISO week containing 2026-06-11: Mon 2026-06-08 → Sun 2026-06-14.

const THURSDAY_ISTANBUL_NOON = new Date('2026-06-11T09:00:00Z'); // 12:00 Istanbul
const THURSDAY_MIDNIGHT_ISTANBUL = new Date('2026-06-11T21:00:00Z'); // 00:00 Istanbul 2026-06-12

describe('istanbulTodayBounds', () => {
  it('returns midnight-to-midnight bounds for a normal Istanbul day', () => {
    const { start, end } = istanbulTodayBounds(THURSDAY_ISTANBUL_NOON);

    expect(start.toISOString()).toBe('2026-06-10T21:00:00.000Z'); // 00:00 Istanbul = 21:00 UTC prev day
    expect(end.toISOString()).toBe('2026-06-11T20:59:59.999Z'); // 23:59:59.999 Istanbul = 20:59:59.999 UTC
  });

  it('rolls into the next calendar day just past midnight Istanbul', () => {
    const { start, end } = istanbulTodayBounds(THURSDAY_MIDNIGHT_ISTANBUL);

    expect(start.toISOString()).toBe('2026-06-11T21:00:00.000Z'); // 00:00 2026-06-12 Istanbul
    expect(end.toISOString()).toBe('2026-06-12T20:59:59.999Z');
  });

  it('start is strictly before end', () => {
    const { start, end } = istanbulTodayBounds(THURSDAY_ISTANBUL_NOON);
    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it('span is exactly 24 hours minus 1ms', () => {
    const { start, end } = istanbulTodayBounds(THURSDAY_ISTANBUL_NOON);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

describe('istanbulWeekStart', () => {
  it('returns Monday of the current ISO week for a Thursday input', () => {
    const weekStart = istanbulWeekStart(THURSDAY_ISTANBUL_NOON);
    // Monday 2026-06-08 00:00 Istanbul = 2026-06-07T21:00:00Z
    expect(weekStart.toISOString()).toBe('2026-06-07T21:00:00.000Z');
  });

  it('returns the same Monday when called with Monday input', () => {
    const monday = new Date('2026-06-08T09:00:00Z'); // 12:00 Istanbul on Monday
    const weekStart = istanbulWeekStart(monday);
    expect(weekStart.toISOString()).toBe('2026-06-07T21:00:00.000Z');
  });

  it('returns the PREVIOUS Monday for a Sunday input', () => {
    const sunday = new Date('2026-06-14T09:00:00Z'); // 12:00 Istanbul on Sunday 2026-06-14
    const weekStart = istanbulWeekStart(sunday);
    expect(weekStart.toISOString()).toBe('2026-06-07T21:00:00.000Z');
  });
});

describe('istanbulWeekEnd', () => {
  it('returns Sunday 23:59:59.999 Istanbul for a Thursday input', () => {
    const weekEnd = istanbulWeekEnd(THURSDAY_ISTANBUL_NOON);
    // Sunday 2026-06-14 23:59:59.999 Istanbul = 2026-06-14T20:59:59.999Z
    expect(weekEnd.toISOString()).toBe('2026-06-14T20:59:59.999Z');
  });

  it('weekEnd is exactly 7 days minus 1ms after weekStart', () => {
    const weekStart = istanbulWeekStart(THURSDAY_ISTANBUL_NOON);
    const weekEnd = istanbulWeekEnd(THURSDAY_ISTANBUL_NOON);
    expect(weekEnd.getTime() - weekStart.getTime()).toBe(7 * 24 * 60 * 60 * 1000 - 1);
  });

  it('weekEnd is after today end', () => {
    const { end: todayEnd } = istanbulTodayBounds(THURSDAY_ISTANBUL_NOON);
    const weekEnd = istanbulWeekEnd(THURSDAY_ISTANBUL_NOON);
    expect(weekEnd.getTime()).toBeGreaterThan(todayEnd.getTime());
  });
});
