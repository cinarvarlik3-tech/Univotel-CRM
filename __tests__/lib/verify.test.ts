/**
 * Unit tests for webhook HMAC verification.
 */
import { describe, expect, it } from 'vitest';
import { verifyNetGsmToken, verifyWhatsAppSignature } from '@/lib/webhooks/verify';

describe('verify', () => {
  it('verifyNetGsmToken accepts valid token', () => {
    expect(verifyNetGsmToken('my-secret-token', 'my-secret-token')).toBe(true);
  });

  it('verifyNetGsmToken rejects invalid token', () => {
    expect(verifyNetGsmToken('wrong', 'my-secret-token')).toBe(false);
  });

  it('verifyNetGsmToken rejects missing token', () => {
    expect(verifyNetGsmToken(undefined, 'my-secret-token')).toBe(false);
  });

  it('verifyWhatsAppSignature rejects missing signature', async () => {
    const result = await verifyWhatsAppSignature('{"test":true}', undefined, 'secret');
    expect(result).toBe(false);
  });

  it('verifyWhatsAppSignature accepts valid HMAC', async () => {
    const body = '{"test":true}';
    const secret = 'test-whatsapp-secret';

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const result = await verifyWhatsAppSignature(body, `sha256=${hex}`, secret);
    expect(result).toBe(true);
  });

  it('verifyWhatsAppSignature rejects tampered body', async () => {
    const body = '{"test":true}';
    const secret = 'test-whatsapp-secret';

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const result = await verifyWhatsAppSignature('{"test":false}', `sha256=${hex}`, secret);
    expect(result).toBe(false);
  });
});
