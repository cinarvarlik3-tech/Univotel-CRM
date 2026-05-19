/**
 * Normalizes lead_details embed shapes from Supabase into a single row object.
 */
import type { LeadDetailRow } from '@/types/domain';

/**
 * Normalizes lead_details from API embed (object, array, or null) to a row or null.
 * @param raw - Raw lead_details value from Supabase join.
 * @returns Normalized LeadDetailRow or null.
 */
export function normalizeLeadDetails(raw: unknown): LeadDetailRow | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return normalizeLeadDetails(raw[0]);
  }

  if (typeof raw === 'object' && 'lead_uuid' in raw) {
    return raw as LeadDetailRow;
  }

  return null;
}
