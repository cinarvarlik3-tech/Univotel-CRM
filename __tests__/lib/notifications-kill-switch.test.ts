/**
 * Unit tests for the dispatch() kill switch.
 *
 * Invariants:
 * - When kill switch is off ('false') and suppressible=true → no Telegram send
 * - When kill switch is off but suppressible=false (webhook_failure) → always sends
 * - When kill switch is on or absent → sends normally
 * - Empty chatIds → no-op regardless of kill switch state
 * - Kill switch read error → fail open (sends normally)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateServiceClient, mockDeliver } = vi.hoisted(() => ({
  mockCreateServiceClient: vi.fn(),
  mockDeliver: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mockCreateServiceClient,
}));

vi.mock('@/lib/telegram/deliver', () => ({
  deliverTelegramToChatIds: (...args: unknown[]) => mockDeliver(...args),
}));

import { dispatch } from '@/lib/notifications/dispatch';

// Builds a minimal Supabase client stub that returns the given cron_settings row.
function buildClient(value: string | null) {
  const row = value !== null ? { value } : null;
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: row, error: null }),
  };
  return { from: () => chain };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDeliver.mockResolvedValue([]);
});

describe('dispatch — kill switch off (suppressible events)', () => {
  it('drops the send when notifications_enabled = "false" and suppressible=true', async () => {
    mockCreateServiceClient.mockReturnValue(buildClient('false'));
    await dispatch(['chat-1'], 'hello');
    expect(mockDeliver).not.toHaveBeenCalled();
  });

  it('still sends when notifications_enabled = "true"', async () => {
    mockCreateServiceClient.mockReturnValue(buildClient('true'));
    await dispatch(['chat-1'], 'hello');
    expect(mockDeliver).toHaveBeenCalledOnce();
  });

  it('still sends when cron_settings row is absent (null)', async () => {
    mockCreateServiceClient.mockReturnValue(buildClient(null));
    await dispatch(['chat-1'], 'hello');
    expect(mockDeliver).toHaveBeenCalledOnce();
  });
});

describe('dispatch — kill switch off but suppressible=false (webhook_failure)', () => {
  it('always sends even when kill switch is off', async () => {
    mockCreateServiceClient.mockReturnValue(buildClient('false'));
    await dispatch(['chat-1'], '[WEBHOOK FAILURE] …', false);
    expect(mockDeliver).toHaveBeenCalledOnce();
    expect(mockCreateServiceClient).not.toHaveBeenCalled();
  });
});

describe('dispatch — empty chatIds', () => {
  it('short-circuits without checking kill switch', async () => {
    await dispatch([], 'hello');
    expect(mockDeliver).not.toHaveBeenCalled();
    expect(mockCreateServiceClient).not.toHaveBeenCalled();
  });
});

describe('dispatch — kill switch read throws', () => {
  it('fails open: sends when Supabase throws', async () => {
    mockCreateServiceClient.mockReturnValue({
      from: () => {
        throw new Error('network error');
      },
    });
    await dispatch(['chat-1'], 'hello');
    expect(mockDeliver).toHaveBeenCalledOnce();
  });
});
