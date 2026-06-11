/**
 * Unit tests for manager panel trend bucketing helpers.
 * Istanbul is UTC+3 year-round (TRT, no DST).
 */
import { describe, expect, it } from 'vitest';
import {
  bucketByIstanbulDay,
  enumerateIstanbulDays,
  istanbulDayKey,
} from '@/lib/analytics/trend-buckets';

describe('istanbulDayKey', () => {
  it('maps a UTC instant to its Istanbul calendar day', () => {
    // 22:30 UTC = 01:30 next day Istanbul.
    expect(istanbulDayKey(new Date('2026-06-10T22:30:00Z'))).toBe('2026-06-11');
    // Noon UTC stays on the same day.
    expect(istanbulDayKey(new Date('2026-06-11T12:00:00Z'))).toBe('2026-06-11');
  });
});

describe('enumerateIstanbulDays', () => {
  it('enumerates inclusive day axis across the range', () => {
    const days = enumerateIstanbulDays(
      new Date('2026-06-07T21:00:00Z'), // 00:00 2026-06-08 Istanbul
      new Date('2026-06-11T20:59:59Z'), // 23:59 2026-06-11 Istanbul
    );
    expect(days).toEqual(['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11']);
  });

  it('returns a single day when from and to fall on the same Istanbul day', () => {
    const days = enumerateIstanbulDays(
      new Date('2026-06-11T06:00:00Z'),
      new Date('2026-06-11T18:00:00Z'),
    );
    expect(days).toEqual(['2026-06-11']);
  });

  it('crosses month boundaries', () => {
    const days = enumerateIstanbulDays(
      new Date('2026-05-30T09:00:00Z'),
      new Date('2026-06-02T09:00:00Z'),
    );
    expect(days).toEqual(['2026-05-30', '2026-05-31', '2026-06-01', '2026-06-02']);
  });
});

describe('bucketByIstanbulDay', () => {
  const days = ['2026-06-10', '2026-06-11', '2026-06-12'];

  it('counts timestamps into the correct Istanbul day buckets', () => {
    const counts = bucketByIstanbulDay(
      [
        '2026-06-10T08:00:00Z', // 11:00 Istanbul → day 0
        '2026-06-10T22:30:00Z', // 01:30 next day Istanbul → day 1
        '2026-06-11T12:00:00Z', // day 1
        '2026-06-12T05:00:00Z', // day 2
      ],
      days,
    );
    expect(counts).toEqual([1, 2, 1]);
  });

  it('ignores timestamps outside the axis and invalid values', () => {
    const counts = bucketByIstanbulDay(['2026-06-01T00:00:00Z', 'not-a-date'], days);
    expect(counts).toEqual([0, 0, 0]);
  });

  it('returns zeroed array for empty input', () => {
    expect(bucketByIstanbulDay([], days)).toEqual([0, 0, 0]);
  });
});
