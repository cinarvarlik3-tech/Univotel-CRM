/**
 * Unit tests for the lead-message-notify flush runner.
 *
 * Key invariants:
 *  - Rows are fanned out per recipient chat ID
 *  - Recipients outside their shift are suppressed (rows still marked flushed)
 *  - Recipients with no shift info get through (gate-open rule)
 *  - One Telegram send per in-shift recipient, containing a digest
 *  - All rows are marked flushed regardless of shift status
 *  - Empty pending_notifications → short-circuit, no sends
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock wiring ──────────────────────────────────────────────────────────────
const { mockCreateServiceClient, mockDispatch } = vi.hoisted(() => ({
  mockCreateServiceClient: vi.fn(),
  mockDispatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mockCreateServiceClient,
}));

vi.mock('@/lib/notifications/dispatch', () => ({
  dispatch: (...args: unknown[]) => mockDispatch(...args),
}));

import { runLeadMessageNotifications } from '@/lib/jobs/run-lead-message-notify';

// ── Helpers ──────────────────────────────────────────────────────────────────

type PendingRow = {
  id: string;
  lead_id: string;
  lead_name: string;
  conversation_id: number | null;
  message_snippet: string;
  is_unclaimed: boolean;
  recipient_chat_ids: string[];
};

type SpRow = {
  telegram_chat_id: string;
  shift_start: string | null;
  shift_end: string | null;
};

function buildClient(pendingRows: PendingRow[], spRows: SpRow[]) {
  const markedIds: string[] = [];

  const spChain = {
    select: () => spChain,
    eq: () => spChain,
    in: () => ({
      then: (fn: (result: unknown) => unknown) =>
        Promise.resolve(fn({ data: spRows, error: null })),
      ...spChain,
      data: spRows,
      error: null,
    }),
    data: spRows,
    error: null,
  };

  const updateChain = {
    in: (col: string, ids: string[]) => {
      markedIds.push(...ids);
      return Promise.resolve({ error: null });
    },
  };

  return {
    markedIds,
    client: {
      from: (table: string) => {
        if (table === 'salespeople') return spChain;
        // pending_notifications
        return {
          select: () => ({
            is: () => ({
              order: () => ({
                limit: () => ({
                  then: (fn: (result: unknown) => unknown) =>
                    Promise.resolve(fn({ data: pendingRows, error: null })),
                }),
              }),
            }),
          }),
          update: () => updateChain,
        };
      },
    },
  };
}

// 10:00 Istanbul (UTC+3)
const IN_SHIFT = new Date('2026-06-10T07:00:00Z');
// 03:00 Istanbul — outside a 09:00–18:00 shift
const OUT_SHIFT = new Date('2026-06-10T00:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('runLeadMessageNotifications', () => {
  it('returns zeros and skips sends when no pending rows', async () => {
    const { client } = buildClient([], []);
    mockCreateServiceClient.mockReturnValue(client);

    const stats = await runLeadMessageNotifications(IN_SHIFT);
    expect(stats.pending).toBe(0);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('sends one digest per in-shift recipient', async () => {
    const rows: PendingRow[] = [
      {
        id: 'r1',
        lead_id: 'l1',
        lead_name: 'Erşan',
        conversation_id: 42,
        message_snippet: 'Merhaba',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-1', 'tg-2'],
      },
      {
        id: 'r2',
        lead_id: 'l2',
        lead_name: 'Ayşe',
        conversation_id: 99,
        message_snippet: 'Oda var mı?',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-1'],
      },
    ];

    const sps: SpRow[] = [
      { telegram_chat_id: 'tg-1', shift_start: '09:00', shift_end: '18:00' },
      { telegram_chat_id: 'tg-2', shift_start: '09:00', shift_end: '18:00' },
    ];

    const { client } = buildClient(rows, sps);
    mockCreateServiceClient.mockReturnValue(client);

    const stats = await runLeadMessageNotifications(IN_SHIFT);

    // tg-1 gets 2 leads, tg-2 gets 1 lead → 2 dispatch calls
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(stats.recipients).toBe(2);
    expect(stats.suppressedShift).toBe(0);
  });

  it('suppresses out-of-shift recipients and still marks rows flushed', async () => {
    const rows: PendingRow[] = [
      {
        id: 'r1',
        lead_id: 'l1',
        lead_name: 'Zeynep',
        conversation_id: 1,
        message_snippet: 'Hi',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-night'],
      },
    ];

    const sps: SpRow[] = [
      { telegram_chat_id: 'tg-night', shift_start: '09:00', shift_end: '18:00' },
    ];

    const { client, markedIds } = buildClient(rows, sps);
    mockCreateServiceClient.mockReturnValue(client);

    const stats = await runLeadMessageNotifications(OUT_SHIFT);

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(stats.suppressedShift).toBe(1);
    // rows still marked flushed (drop policy)
    expect(markedIds).toContain('r1');
  });

  it('passes the gate when shift info is missing (open-gate rule)', async () => {
    const rows: PendingRow[] = [
      {
        id: 'r1',
        lead_id: 'l1',
        lead_name: 'Mert',
        conversation_id: null,
        message_snippet: 'Hello',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-no-shift'],
      },
    ];

    // Salesperson row with null shift bounds — not present in spRows at all
    const sps: SpRow[] = [];

    const { client } = buildClient(rows, sps);
    mockCreateServiceClient.mockReturnValue(client);

    await runLeadMessageNotifications(OUT_SHIFT);

    // No shift info → gate open → should send
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('digest sent to tg-1 contains both lead names when she has 2 pending rows', async () => {
    const rows: PendingRow[] = [
      {
        id: 'r1',
        lead_id: 'l1',
        lead_name: 'Erşan',
        conversation_id: 1,
        message_snippet: 'msg1',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-1'],
      },
      {
        id: 'r2',
        lead_id: 'l2',
        lead_name: 'Fatma',
        conversation_id: 2,
        message_snippet: 'msg2',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-1'],
      },
    ];

    const sps: SpRow[] = [{ telegram_chat_id: 'tg-1', shift_start: '09:00', shift_end: '18:00' }];

    const { client } = buildClient(rows, sps);
    mockCreateServiceClient.mockReturnValue(client);

    await runLeadMessageNotifications(IN_SHIFT);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const [chatIds, message] = mockDispatch.mock.calls[0];
    expect(chatIds).toEqual(['tg-1']);
    expect(message).toContain('Erşan');
    expect(message).toContain('Fatma');
    expect(message).toContain('[NEW MESSAGES — 2 leads]');
  });

  it('marks all row IDs flushed including suppressed ones', async () => {
    const rows: PendingRow[] = [
      {
        id: 'r1',
        lead_id: 'l1',
        lead_name: 'A',
        conversation_id: null,
        message_snippet: 'x',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-in'],
      },
      {
        id: 'r2',
        lead_id: 'l2',
        lead_name: 'B',
        conversation_id: null,
        message_snippet: 'y',
        is_unclaimed: false,
        recipient_chat_ids: ['tg-out'],
      },
    ];

    const sps: SpRow[] = [
      { telegram_chat_id: 'tg-in', shift_start: '09:00', shift_end: '18:00' },
      { telegram_chat_id: 'tg-out', shift_start: '22:00', shift_end: '06:00' }, // OUT at IN_SHIFT
    ];

    const { client, markedIds } = buildClient(rows, sps);
    mockCreateServiceClient.mockReturnValue(client);

    await runLeadMessageNotifications(IN_SHIFT);

    expect(markedIds).toContain('r1');
    expect(markedIds).toContain('r2');
  });
});
