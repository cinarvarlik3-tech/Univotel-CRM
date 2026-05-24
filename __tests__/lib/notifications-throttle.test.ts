import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isThrottled } from '@/lib/notifications/throttle';

import { countRecentUnresolvedNotifications } from '@/lib/jobs/notifications-db';

vi.mock('@/lib/jobs/notifications-db', () => ({
  countRecentUnresolvedNotifications: vi.fn(),
}));

describe('isThrottled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(countRecentUnresolvedNotifications).mockResolvedValue(0);
  });

  it('returns true when count > 0 for lead-scoped alert', async () => {
    vi.mocked(countRecentUnresolvedNotifications).mockResolvedValue(1);

    const result = await isThrottled({
      alertType: 'sla_breach',
      leadUuid: 'lead-1',
    });

    expect(result).toBe(true);
    expect(countRecentUnresolvedNotifications).toHaveBeenCalled();
  });
});
