/**
 * REF code generation for GTM session attribution.
 */

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REF_PREFIX = 'UV-';
const REF_SUFFIX_LENGTH = 4;

/**
 * Generates a random REF code in UV-XXXX format.
 * @returns Uppercase REF code string.
 */
export function generateRefCode(): string {
  let suffix = '';
  for (let i = 0; i < REF_SUFFIX_LENGTH; i += 1) {
    suffix += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  }
  return `${REF_PREFIX}${suffix}`;
}

/**
 * Validates REF code format.
 * @param refCode - Candidate REF string.
 * @returns True when format matches UV-XXXX.
 */
export function isValidRefCodeFormat(refCode: string): boolean {
  return /^UV-[A-Z0-9]{4}$/.test(refCode);
}
