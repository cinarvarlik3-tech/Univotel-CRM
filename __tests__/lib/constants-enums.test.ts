/**
 * Unit tests for enum constant arrays used in DB CHECK constraints.
 */
import { describe, expect, it } from 'vitest';
import {
  DORM_AWAITING_VALUES,
  FUNNEL_STATUSES,
  LEAD_SOURCES,
  LOSS_REASONS,
  MESSAGE_FROM_VALUES,
  normalizeChatwootFunnelLabel,
  SPECIAL_STATES,
} from '@/lib/constants';

/** Returns true if array has no duplicate values. */
function hasNoDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe('constants enums', () => {
  it('FUNNEL_STATUSES is non-empty and duplicate-free', () => {
    expect(FUNNEL_STATUSES.length).toBeGreaterThan(0);
    expect(hasNoDuplicates(FUNNEL_STATUSES)).toBe(true);
  });

  it('LEAD_SOURCES is non-empty and duplicate-free', () => {
    expect(LEAD_SOURCES.length).toBe(10);
    expect(hasNoDuplicates(LEAD_SOURCES)).toBe(true);
    expect(LEAD_SOURCES).toContain('form');
  });

  it('MESSAGE_FROM_VALUES is non-empty and duplicate-free', () => {
    expect(MESSAGE_FROM_VALUES.length).toBeGreaterThan(0);
    expect(hasNoDuplicates(MESSAGE_FROM_VALUES)).toBe(true);
  });

  it('SPECIAL_STATES is non-empty and duplicate-free', () => {
    expect(SPECIAL_STATES.length).toBe(2);
    expect(SPECIAL_STATES).toContain('ogrenci-degil');
    expect(hasNoDuplicates(SPECIAL_STATES)).toBe(true);
  });

  it('LOSS_REASONS is non-empty and duplicate-free', () => {
    expect(LOSS_REASONS.length).toBe(9);
    expect(hasNoDuplicates(LOSS_REASONS)).toBe(true);
  });

  it('DORM_AWAITING_VALUES is non-empty and duplicate-free', () => {
    expect(DORM_AWAITING_VALUES.length).toBe(3);
    expect(DORM_AWAITING_VALUES[0]).toBe('kyk-sonuc-bekliyor');
    expect(hasNoDuplicates(DORM_AWAITING_VALUES)).toBe(true);
  });

  it('normalizeChatwootFunnelLabel maps kayıp to lost', () => {
    expect(normalizeChatwootFunnelLabel('kayıp')).toBe('lost');
    expect(normalizeChatwootFunnelLabel('KAYIP')).toBe('lost');
    expect(normalizeChatwootFunnelLabel('arandi')).toBe('arandi');
  });
});
