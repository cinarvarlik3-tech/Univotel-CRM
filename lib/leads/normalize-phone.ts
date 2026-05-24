/**
 * Phone number normalization for Turkish mobile numbers.
 * Converts inbound formats to 05xxxxxxxxx standard form.
 */

/** Result of phone normalization attempt. */
export interface NormalizeResult {
  phone: string;
  failed: boolean;
}

/**
 * Normalizes a raw phone string to Turkish mobile format 05xxxxxxxxx.
 * @param raw - Raw phone number from webhook or form input.
 * @returns Normalized phone and whether normalization failed.
 */
export function normalizePhone(raw: string): NormalizeResult {
  const cleaned = raw.replace(/\s+/g, '').replace(/-/g, '');

  if (cleaned.startsWith('+90')) {
    return { phone: '0' + cleaned.slice(3), failed: false };
  }

  if (cleaned.startsWith('90') && cleaned.length === 12) {
    return { phone: '0' + cleaned.slice(2), failed: false };
  }

  if (cleaned.startsWith('5') && cleaned.length === 10) {
    return { phone: '0' + cleaned, failed: false };
  }

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return { phone: cleaned, failed: false };
  }

  return { phone: raw, failed: true };
}

/**
 * Converts normalized Turkish mobile (05xxxxxxxxx) to E.164 (+905xxxxxxxxx) for Meta API.
 * @param normalized - Output from normalizePhone when failed is false.
 * @returns E.164 string or null if format is invalid.
 */
export function toE164(normalized: string): string | null {
  if (/^05\d{9}$/.test(normalized)) {
    return `+90${normalized.slice(1)}`;
  }
  if (/^\+905\d{9}$/.test(normalized.replace(/\s/g, ''))) {
    return normalized.replace(/\s/g, '');
  }
  return null;
}
