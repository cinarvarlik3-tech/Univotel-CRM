/**
 * Instagram handle normalization for lead contact identifiers.
 * Handles are stored in leads.lead_phone when message_from is instagram.
 */

/** Result of Instagram handle normalization. */
export interface NormalizeInstagramHandleResult {
  handle: string;
  failed: boolean;
}

/**
 * Normalizes a raw Instagram username for storage and deduplication.
 * @param raw - Username from Chatwoot or manual input (may include leading @).
 * @returns Lowercase handle without @, or original trimmed value when invalid.
 */
export function normalizeInstagramHandle(raw: string): NormalizeInstagramHandleResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { handle: raw, failed: true };
  }

  const withoutAt = trimmed.replace(/^@+/, '');
  const normalized = withoutAt.toLowerCase();

  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
    return { handle: trimmed, failed: true };
  }

  return { handle: normalized, failed: false };
}
