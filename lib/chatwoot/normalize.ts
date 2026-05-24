/**
 * Normalization helpers for matching Chatwoot agents to CRM salespeople.
 */

/**
 * Normalizes email for case-insensitive comparison.
 * @param email - Raw email string.
 * @returns Normalized email or null.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes display names for fuzzy equality checks.
 * @param name - Raw display name.
 * @returns Normalized name or null.
 */
export function normalizeDisplayName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
  return trimmed.length > 0 ? trimmed : null;
}
