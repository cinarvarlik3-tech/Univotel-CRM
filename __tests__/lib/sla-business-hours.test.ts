/**
 * Unit tests for slaBusinessHoursSince — the TypeScript mirror of the SQL
 * sla_business_hours_since function used in the sla_update cron.
 *
 * All times are given in Istanbul (UTC+3). Represented as UTC timestamps
 * by subtracting 3 h (e.g., 10:30 Istanbul = 07:30 UTC).
 *
 * "Now" is always set to a time within business hours (09:00–17:00 Istanbul)
 * because the cron only runs in that window.
 */
import { describe, expect, it } from 'vitest';
import { slaBusinessHoursSince } from '@/lib/leads/sla';

// UTC helpers: Istanbul = UTC+3
const ist = (dateStr: string) => new Date(dateStr);

// Today: 2026-06-26
// now = 10:30 IST = 07:30 UTC
const NOW = ist('2026-06-26T07:30:00Z');

describe('slaBusinessHoursSince — event today during business hours', () => {
  it('message at 09:00 IST, checked at 10:30 IST → 1.5 h elapsed', () => {
    const ev = ist('2026-06-26T06:00:00Z'); // 09:00 IST
    expect(slaBusinessHoursSince(ev, NOW)).toBeCloseTo(1.5, 5);
  });

  it('message at 10:00 IST, checked at 10:30 IST → 0.5 h elapsed', () => {
    const ev = ist('2026-06-26T07:00:00Z'); // 10:00 IST
    expect(slaBusinessHoursSince(ev, NOW)).toBeCloseTo(0.5, 5);
  });

  it('message at 10:30 IST (same as now) → 0 h elapsed', () => {
    expect(slaBusinessHoursSince(NOW, NOW)).toBeCloseTo(0, 5);
  });

  it('message at 09:00 IST, checked at 11:00 IST → exactly 2 h (breach threshold)', () => {
    const ev = ist('2026-06-26T06:00:00Z'); // 09:00 IST
    const at11 = ist('2026-06-26T08:00:00Z'); // 11:00 IST
    expect(slaBusinessHoursSince(ev, at11)).toBeCloseTo(2.0, 5);
  });
});

describe('slaBusinessHoursSince — event in overnight gap (yesterday 17:00–today 09:00)', () => {
  it('message at 17:30 IST yesterday, checked at 10:30 IST today → 1.5 h elapsed (from today 09:00)', () => {
    const ev = ist('2026-06-25T14:30:00Z'); // yesterday 17:30 IST
    expect(slaBusinessHoursSince(ev, NOW)).toBeCloseTo(1.5, 5);
  });

  it('message at 00:00 IST today (midnight, in gap), checked at 10:30 IST → 1.5 h elapsed', () => {
    const ev = ist('2026-06-25T21:00:00Z'); // today 00:00 IST
    expect(slaBusinessHoursSince(ev, NOW)).toBeCloseTo(1.5, 5);
  });

  it('message at 17:00 IST yesterday, checked at 11:00 IST today → 2.0 h elapsed (breached)', () => {
    const ev = ist('2026-06-25T14:00:00Z'); // yesterday 17:00 IST
    const at11 = ist('2026-06-26T08:00:00Z'); // today 11:00 IST
    expect(slaBusinessHoursSince(ev, at11)).toBeCloseTo(2.0, 5);
  });
});

describe("slaBusinessHoursSince — event during yesterday's business hours", () => {
  it('message at 16:30 IST yesterday, checked at 10:30 IST today → 0.5 + 1.5 = 2.0 h', () => {
    // 0.5 h remaining from yesterday (16:30→17:00) + 1.5 h today (09:00→10:30)
    const ev = ist('2026-06-25T13:30:00Z'); // yesterday 16:30 IST
    expect(slaBusinessHoursSince(ev, NOW)).toBeCloseTo(2.0, 5);
  });

  it('message at 16:30 IST yesterday, checked at 10:29 IST today → just under 2 h', () => {
    const ev = ist('2026-06-25T13:30:00Z'); // yesterday 16:30 IST
    const at1029 = ist('2026-06-26T07:29:00Z'); // today 10:29 IST
    expect(slaBusinessHoursSince(ev, at1029)).toBeLessThan(2.0);
  });

  it('message at 09:00 IST yesterday, checked at 10:30 IST today → 8 + 1.5 = 9.5 h', () => {
    // Full yesterday window: 09:00→17:00 = 8h, plus 1.5h today
    const ev = ist('2026-06-25T06:00:00Z'); // yesterday 09:00 IST
    expect(slaBusinessHoursSince(ev, NOW)).toBeCloseTo(9.5, 5);
  });

  it('spec example: message at 16:30 IST, breach at 10:30 IST next morning → exactly 2 h', () => {
    const ev = ist('2026-06-25T13:30:00Z'); // 16:30 IST yesterday
    const breach = ist('2026-06-26T07:30:00Z'); // 10:30 IST today
    expect(slaBusinessHoursSince(ev, breach)).toBeCloseTo(2.0, 5);
  });
});

describe('slaBusinessHoursSince — event older than yesterday 09:00', () => {
  it('message two days ago returns 99', () => {
    const ev = ist('2026-06-24T10:00:00Z'); // two days ago
    expect(slaBusinessHoursSince(ev, NOW)).toBe(99);
  });

  it('message exactly at yesterday 09:00 is NOT older (edge: >= yest09)', () => {
    const ev = ist('2026-06-25T06:00:00Z'); // yesterday 09:00 IST = 06:00 UTC
    const result = slaBusinessHoursSince(ev, NOW);
    expect(result).not.toBe(99);
    expect(result).toBeCloseTo(9.5, 5); // 8 h yesterday + 1.5 h today
  });

  it('message one second before yesterday 09:00 returns 99', () => {
    const ev = ist('2026-06-25T05:59:59Z'); // 1s before yesterday 09:00 IST
    expect(slaBusinessHoursSince(ev, NOW)).toBe(99);
  });
});
