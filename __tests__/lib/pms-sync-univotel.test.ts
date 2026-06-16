/**
 * Unit tests for univotel → CRM sync mapping helpers.
 */
import { describe, expect, it } from 'vitest';
import { mapHotelStatus } from '@/lib/pms/sync-univotel';

describe('mapHotelStatus', () => {
  it('maps visible hotels to active', () => {
    expect(mapHotelStatus(true)).toBe('active');
    expect(mapHotelStatus(null)).toBe('active');
  });

  it('maps hidden hotels to paused', () => {
    expect(mapHotelStatus(false)).toBe('paused');
  });
});
