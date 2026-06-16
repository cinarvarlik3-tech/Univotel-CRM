/**
 * Unit tests for purchased_room funnel advance rules.
 */
import { describe, expect, it } from 'vitest';
import { purchasedRoomAdvanceMode } from '@/lib/constants';

describe('purchasedRoomAdvanceMode', () => {
  it('requires room type when advancing to kapora-alindi', () => {
    expect(purchasedRoomAdvanceMode('ziyaret-etti', 'kapora-alindi')).toBe('required');
  });

  it('confirms room type when advancing kapora to sozlesme', () => {
    expect(purchasedRoomAdvanceMode('kapora-alindi', 'sozlesme-imzalandi')).toBe('confirm');
  });

  it('returns null for other transitions', () => {
    expect(purchasedRoomAdvanceMode('yeni', 'aranacak')).toBeNull();
    expect(purchasedRoomAdvanceMode('kapora-alindi', 'lost')).toBeNull();
  });
});
