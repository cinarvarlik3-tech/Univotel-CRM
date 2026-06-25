/**
 * Meta WhatsApp webhook POST handler tests — signature auth and processing dispatch.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { EventEmitter } from 'events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runWithWebhookLog = vi.fn();
const recordTerminalWebhookLog = vi.fn();

vi.mock('@/lib/webhooks/run-with-webhook-log', () => ({
  runWithWebhookLog: (...args: unknown[]) => runWithWebhookLog(...args),
}));

vi.mock('@/lib/webhooks/webhook-log', () => ({
  recordTerminalWebhookLog: (...args: unknown[]) => recordTerminalWebhookLog(...args),
}));

vi.mock('@/lib/webhooks/process-whatsapp', () => ({
  processWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

import handler from '@/pages/api/webhooks/whatsapp-calls';

async function signBody(body: string, secret = 'test-whatsapp-secret'): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hex}`;
}

function createMockRes() {
  const res = {
    statusCode: 200,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res as typeof res & NextApiResponse;
}

function createPostRequest(body: string, headers: Record<string, string> = {}): NextApiRequest {
  const req = new EventEmitter() as NextApiRequest & EventEmitter;
  req.method = 'POST';
  req.headers = headers;
  req.query = {};

  queueMicrotask(() => {
    req.emit('data', Buffer.from(body));
    req.emit('end');
  });

  return req;
}

describe('whatsapp-calls POST handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runWithWebhookLog.mockResolvedValue(undefined);
  });

  it('returns 401 when x-hub-signature-256 is missing', async () => {
    const body = '{"entry":[]}';
    const req = createPostRequest(body);
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(runWithWebhookLog).not.toHaveBeenCalled();
    // Verification failures are now logged as a rejected/unauthorized outcome.
    expect(recordTerminalWebhookLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected', reasonCode: 'unauthorized' }),
    );
  });

  it('returns 401 when signature is invalid', async () => {
    const body = '{"entry":[]}';
    const req = createPostRequest(body, { 'x-hub-signature-256': 'sha256=deadbeef' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(runWithWebhookLog).not.toHaveBeenCalled();
  });

  it('returns 200 and runs webhook log wrapper when signature is valid', async () => {
    const body = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                calls: [{ from: '905551234567', timestamp: '1710000000', id: 'call_1' }],
              },
            },
          ],
        },
      ],
    });
    const signature = await signBody(body);
    const req = createPostRequest(body, { 'x-hub-signature-256': signature });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(runWithWebhookLog).toHaveBeenCalledOnce();
    expect(runWithWebhookLog.mock.calls[0][0]).toMatchObject({
      source: 'whatsapp_calls',
      eventType: 'call_event',
      idempotencyKey: 'wacalls_905551234567_1710000000',
    });
  });
});
