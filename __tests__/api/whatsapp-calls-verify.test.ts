/**
 * Meta WhatsApp webhook GET verification challenge tests.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/webhooks/create-webhook-handler', () => ({
  createWebhookHandler: () => vi.fn(),
}));

import handler from '@/pages/api/webhooks/whatsapp-calls';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined as string | undefined,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: string) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res as typeof res & NextApiResponse;
}

describe('whatsapp-calls GET verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hub.challenge as plain text when verify token matches', async () => {
    const req = {
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-whatsapp-secret',
        'hub.challenge': '1234567890',
      },
    } as unknown as NextApiRequest;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('1234567890');
  });

  it('returns 403 when verify token does not match', async () => {
    const req = {
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': '1234567890',
      },
    } as unknown as NextApiRequest;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.ended).toBe(true);
  });

  it('returns 403 when hub.mode is not subscribe', async () => {
    const req = {
      method: 'GET',
      query: {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test-whatsapp-secret',
        'hub.challenge': '1234567890',
      },
    } as unknown as NextApiRequest;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.ended).toBe(true);
  });
});
