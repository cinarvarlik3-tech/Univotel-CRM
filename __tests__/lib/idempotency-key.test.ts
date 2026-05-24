/**
 * Webhook idempotency key generation tests.
 */
import { describe, expect, it } from 'vitest';
import {
  chatwootIdempotencyKey,
  netgsmIdempotencyKey,
  whatsAppIdempotencyKey,
} from '@/lib/webhooks/idempotency-key';
import type { NextApiRequest } from 'next';

describe('idempotency keys', () => {
  it('builds chatwoot create key', () => {
    const key = chatwootIdempotencyKey(
      {
        event: 'message_created',
        id: 1,
        conversation: { id: 456 },
        message: { id: 789 },
      } as never,
      {} as NextApiRequest,
    );
    expect(key).toBe('chatwoot_456_789');
  });

  it('builds netgsm key from kimlik', () => {
    const key = netgsmIdempotencyKey({
      kimlik: 'abc123',
      arayan: '05321111111',
      scenario: 'cdr',
      sure: 10,
    });
    expect(key).toBe('netgsm_abc123');
  });

  it('builds whatsapp status key', () => {
    const key = whatsAppIdempotencyKey({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: 'wamid.abc', status: 'delivered' }],
              },
            },
          ],
        },
      ],
    });
    expect(key).toBe('wastatus_wamid.abc_delivered');
  });
});
