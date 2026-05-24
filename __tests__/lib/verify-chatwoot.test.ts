/**
 * Chatwoot HMAC verification tests.
 */
import { describe, expect, it } from 'vitest';
import { verifyChatwootSignature } from '@/lib/webhooks/verify';

async function signChatwoot(secret: string, timestamp: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('verifyChatwootSignature', () => {
  it('accepts valid signature on raw body', async () => {
    const secret = 'test-chatwoot-secret';
    const body = '{"event":"message_created","id":1}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const hex = await signChatwoot(secret, timestamp, body);

    const valid = await verifyChatwootSignature(body, `sha256=${hex}`, timestamp, secret);
    expect(valid).toBe(true);
  });

  it('rejects tampered body (key order change)', async () => {
    const secret = 'test-chatwoot-secret';
    const body =
      '{"event":"message_created","id":1,"meta":{"sender":{"phone_number":"+905321234567"}}}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const hex = await signChatwoot(secret, timestamp, body);
    const tampered =
      '{"id":1,"event":"message_created","meta":{"sender":{"phone_number":"+905321234567"}}}';

    const valid = await verifyChatwootSignature(tampered, `sha256=${hex}`, timestamp, secret);
    expect(valid).toBe(false);
  });
});
