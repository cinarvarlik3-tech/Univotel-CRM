/**
 * Webhook signature verification for Chatwoot, WhatsApp, and NetGSM.
 * Uses Web Crypto API for HMAC (Cloudflare Workers compatible).
 */
import { timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';

/**
 * Converts ArrayBuffer to hex string.
 * @param buffer - ArrayBuffer from digest operation.
 * @returns Lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes HMAC-SHA256 hex digest using Web Crypto API.
 * @param secret - HMAC secret key.
 * @param message - Message to sign.
 * @returns Hex-encoded HMAC digest.
 */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bufferToHex(signature);
}

/**
 * Verifies Chatwoot webhook HMAC signature and timestamp freshness.
 * @param rawBody - Raw request body string.
 * @param signature - X-Chatwoot-Signature header value.
 * @param timestamp - X-Chatwoot-Timestamp header value.
 * @param secret - Chatwoot webhook secret.
 * @returns True if signature is valid and timestamp is fresh.
 */
export async function verifyChatwootSignature(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string = env.CHATWOOT_WEBHOOK_SECRET,
): Promise<boolean> {
  if (!signature || !timestamp) return false;

  const ts = Number(timestamp);
  if (Number.isNaN(ts)) return false;

  const ageMs = Math.abs(Date.now() - ts * 1000);
  if (ageMs > 5 * 60 * 1000) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  const provided = signature.replace(/^sha256=/, '');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return expected === provided;
  }
}

/**
 * Verifies WhatsApp Cloud API webhook HMAC signature.
 * @param rawBody - Raw request body string.
 * @param signature - x-hub-signature-256 header value.
 * @param secret - Meta app secret.
 * @returns True if signature is valid.
 */
export async function verifyWhatsAppSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string = env.WHATSAPP_WEBHOOK_SECRET,
): Promise<boolean> {
  if (!signature) return false;

  const expected = await hmacSha256Hex(secret, rawBody);
  const provided = signature.replace(/^sha256=/, '');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return expected === provided;
  }
}

/**
 * Verifies NetGSM static token with timing-safe comparison.
 * @param bodyToken - Token from webhook body.
 * @param expectedToken - Configured static token.
 * @returns True if tokens match.
 */
export function verifyNetGsmToken(
  bodyToken: string | undefined,
  expectedToken: string = env.NETGSM_STATIC_TOKEN,
): boolean {
  if (!bodyToken) return false;

  try {
    const a = Buffer.from(bodyToken);
    const b = Buffer.from(expectedToken);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return bodyToken === expectedToken;
  }
}

/**
 * Reads raw request body as string for HMAC verification.
 * @param body - Parsed or raw body from Next.js request.
 * @returns Raw body string.
 */
export function getRawBodyString(body: unknown): string {
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}
