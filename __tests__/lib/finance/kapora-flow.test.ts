/**
 * Unit tests for kapora orchestration compensation on funnel-write failure.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createFinanceRow = vi.fn();
const vacateFinanceRow = vi.fn();
const assertKaporaFinanceReady = vi.fn();
const setPurchasedRoom = vi.fn();
const updateLeadRecord = vi.fn();

vi.mock('@/lib/finance/create-finance-row', () => ({
  createFinanceRow,
  vacateFinanceRow,
}));

vi.mock('@/lib/finance/kapora-gate', () => ({
  assertKaporaFinanceReady,
  normalizeFinanceTerms: (input: {
    moveInMonth?: string;
    dealDuration?: number;
    discount?: number;
  }) => ({
    moveInMonth: input.moveInMonth ?? '2026-09',
    dealDuration: input.dealDuration ?? 9,
    discount: input.discount ?? 0,
  }),
}));

vi.mock('@/lib/pms/purchased-room', () => ({
  setPurchasedRoom,
}));

vi.mock('@/lib/leads/update-lead', () => ({
  updateLeadRecord,
}));

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}));

describe('advanceToKapora', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertKaporaFinanceReady.mockResolvedValue(10000);
    createFinanceRow.mockResolvedValue('finance-row-1');
    setPurchasedRoom.mockResolvedValue(undefined);
    vacateFinanceRow.mockResolvedValue(undefined);
  });

  it('vacates finance row when funnel write fails', async () => {
    updateLeadRecord.mockRejectedValue(new Error('Funnel write failed'));
    const { advanceToKapora } = await import('@/lib/finance/kapora-flow');

    await expect(
      advanceToKapora({
        leadId: 'lead-1',
        purchasedRoom: 'room-1',
        moveInMonth: '2026-09',
        actorId: 'user-1',
        existing: { funnel_status: 'ziyaret-etti', assigned_to: 'user-1' },
      }),
    ).rejects.toThrow('Funnel write failed');

    expect(createFinanceRow).toHaveBeenCalledOnce();
    expect(vacateFinanceRow).toHaveBeenCalledWith(expect.anything(), 'finance-row-1');
  });

  it('does not vacate on successful funnel write', async () => {
    updateLeadRecord.mockResolvedValue({ lead: { uuid: 'lead-1' }, assignedToChanged: false });
    const { advanceToKapora } = await import('@/lib/finance/kapora-flow');

    await advanceToKapora({
      leadId: 'lead-1',
      purchasedRoom: 'room-1',
      moveInMonth: '2026-09',
      actorId: 'user-1',
      existing: { funnel_status: 'ziyaret-etti', assigned_to: 'user-1' },
    });

    expect(vacateFinanceRow).not.toHaveBeenCalled();
  });
});
