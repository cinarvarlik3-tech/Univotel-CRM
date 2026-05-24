/**
 * DNI virtual number normalization for matching NetGSM CDR payloads.
 */

/**
 * Strips a phone/virtual number to comparable digits (90XXXXXXXXXX).
 * @param raw - Raw phone string from webhook or dni_numbers table.
 * @returns Digit-only string with Turkey country code when possible.
 */
export function normalizeVirtualNumberDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits.startsWith('90') && digits.length >= 12) {
    return digits.slice(0, 12);
  }

  if (digits.startsWith('0') && digits.length === 11) {
    return `90${digits.slice(1)}`;
  }

  if (digits.startsWith('5') && digits.length === 10) {
    return `90${digits}`;
  }

  return digits;
}

/**
 * Converts a stored virtual number to E.164 for GTM display (+90...).
 * @param raw - Virtual number from database.
 * @returns E.164 string or original when conversion fails.
 */
export function virtualNumberToE164(raw: string): string {
  const digits = normalizeVirtualNumberDigits(raw);
  if (digits.startsWith('90') && digits.length === 12) {
    return `+${digits}`;
  }
  return raw;
}

/**
 * Returns true when two phone/virtual strings refer to the same number.
 * @param a - First phone string.
 * @param b - Second phone string.
 * @returns Whether normalized digits match.
 */
export function virtualNumbersMatch(a: string, b: string): boolean {
  return normalizeVirtualNumberDigits(a) === normalizeVirtualNumberDigits(b);
}
