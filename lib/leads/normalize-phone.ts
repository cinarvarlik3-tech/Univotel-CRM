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

  return { phone: raw.trim(), failed: true };
}
