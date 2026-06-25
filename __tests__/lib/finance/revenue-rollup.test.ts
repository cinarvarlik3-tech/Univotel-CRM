/**
 * Unit tests for FMS revenue rollup from breakdown rows.
 */
import { describe, expect, it, vi } from 'vitest';
import { rollupBreakdownRows, type PropertyRevenue } from '@/lib/finance/revenue';

vi.mock('@/lib/finance/commission', () => ({
  calculatePartnerCommission: vi.fn(async (partnerId: string, revenue: number) => {
    if (partnerId === 'partner-a') return revenue * 0.1;
    if (partnerId === 'partner-b') return revenue * 0.2;
    return 0;
  }),
}));

describe('rollupBreakdownRows', () => {
  const rows: PropertyRevenue[] = [
    {
      partnerId: 'partner-a',
      partnerName: 'Partner A',
      propertyId: 'prop-1',
      propertyName: 'Hotel One',
      customerCount: 2,
      propertyRevenue: 1000,
    },
    {
      partnerId: null,
      partnerName: null,
      propertyId: 'prop-2',
      propertyName: 'Unlinked Hotel',
      customerCount: 1,
      propertyRevenue: 500,
    },
    {
      partnerId: 'partner-b',
      partnerName: 'Partner B',
      propertyId: 'prop-3',
      propertyName: 'Hotel Two',
      customerCount: 1,
      propertyRevenue: 2000,
    },
  ];

  it('rolls up partner revenue and commission via chokepoint', async () => {
    const result = await rollupBreakdownRows(rows);

    expect(result.partners).toHaveLength(2);
    expect(result.partners[0].partnerId).toBe('partner-b');
    expect(result.partners[0].revenue).toBe(2000);
    expect(result.partners[0].ourCut).toBe(400);
    expect(result.partners[0].profit).toBe(1600);

    expect(result.partners[1].partnerId).toBe('partner-a');
    expect(result.partners[1].ourCut).toBe(100);
  });

  it('surfaces unattributed bucket separately with zero commission', async () => {
    const result = await rollupBreakdownRows(rows);

    expect(result.unattributed?.partnerName).toBe('Unattributed');
    expect(result.unattributed?.revenue).toBe(500);
    expect(result.unattributed?.ourCut).toBe(0);
    expect(result.unattributed?.profit).toBe(500);
  });

  it('includes unattributed revenue in grand totals', async () => {
    const result = await rollupBreakdownRows(rows);

    expect(result.grandRevenue).toBe(3500);
    expect(result.grandOurCut).toBe(500);
    expect(result.grandProfit).toBe(3000);
  });
});
