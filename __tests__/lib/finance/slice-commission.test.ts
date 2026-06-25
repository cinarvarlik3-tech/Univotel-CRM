/**
 * Unit tests for FMS slice commission helper.
 */
import { describe, expect, it } from 'vitest';
import { applySliceCommission } from '@/lib/finance/slice-commission';

describe('applySliceCommission', () => {
  it('applies flat rate to revenue slice', () => {
    expect(applySliceCommission(1000, 0.1)).toEqual({
      revenue: 1000,
      ourCut: 100,
      profit: 900,
    });
  });

  it('returns zero cut when rate is zero (unattributed)', () => {
    expect(applySliceCommission(500, 0)).toEqual({
      revenue: 500,
      ourCut: 0,
      profit: 500,
    });
  });
});
