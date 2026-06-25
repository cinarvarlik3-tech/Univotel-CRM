/**
 * Unit tests for kapora finance gate validation.
 */
import { describe, expect, it, vi } from 'vitest';
import { normalizeFinanceTerms } from '@/lib/finance/kapora-gate';

describe('normalizeFinanceTerms', () => {
  it('applies defaults when optional inputs omitted', () => {
    const terms = normalizeFinanceTerms({});
    expect(terms.dealDuration).toBe(9);
    expect(terms.discount).toBe(0);
    expect(terms.moveInMonth).toMatch(/^\d{4}-\d{2}$/);
  });

  it('preserves explicit duration, discount, and move-in month', () => {
    expect(
      normalizeFinanceTerms({ dealDuration: 12, discount: 1500, moveInMonth: '2026-09' }),
    ).toEqual({
      dealDuration: 12,
      discount: 1500,
      moveInMonth: '2026-09',
    });
  });
});

describe('assertKaporaFinanceReady validation messages', () => {
  it('rejects missing purchased room before querying price', async () => {
    const { assertKaporaFinanceReady } = await import('@/lib/finance/kapora-gate');
    const supa = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { purchased_room: null }, error: null }),
          }),
        }),
      }),
      rpc: vi.fn(),
    };

    await expect(
      assertKaporaFinanceReady(supa as never, 'lead-1', {
        purchasedRoom: '',
        moveInMonth: '2026-09',
        dealDuration: 9,
        discount: 0,
      }),
    ).rejects.toThrow('Kapora için oda tipi seçilmelidir');
  });

  it('rejects deal duration outside 1–12', async () => {
    const { assertKaporaFinanceReady } = await import('@/lib/finance/kapora-gate');
    const supa = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { purchased_room: 'room-1' }, error: null }),
          }),
        }),
      }),
      rpc: vi.fn(),
    };

    await expect(
      assertKaporaFinanceReady(supa as never, 'lead-1', {
        purchasedRoom: 'room-1',
        moveInMonth: '2026-09',
        dealDuration: 13,
        discount: 0,
      }),
    ).rejects.toThrow('Sözleşme süresi 1–12 ay arasında olmalıdır');
  });

  it('blocks when fms_price_for_month returns null', async () => {
    const { assertKaporaFinanceReady } = await import('@/lib/finance/kapora-gate');
    const supa = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { purchased_room: 'room-1' }, error: null }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    await expect(
      assertKaporaFinanceReady(supa as never, 'lead-1', {
        purchasedRoom: 'room-1',
        moveInMonth: '2026-09',
        dealDuration: 9,
        discount: 0,
      }),
    ).rejects.toThrow('2026-09');
  });
});
