/**
 * Parses lead_details.rec_hotel jsonb into typed recommendation items.
 */
import type { RecHotelItem } from '@/types/domain';

/**
 * Normalizes rec_hotel from Supabase jsonb into a recommendation array or null.
 * @param raw - Raw rec_hotel value from lead_details.
 * @returns Parsed recommendations or null when empty/invalid.
 */
export function parseRecHotel(raw: unknown): RecHotelItem[] | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const items: RecHotelItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const row = entry as Record<string, unknown>;
    if (
      typeof row.property_id !== 'string' ||
      typeof row.hotel_name !== 'string' ||
      typeof row.district !== 'string' ||
      !Array.isArray(row.tags)
    ) {
      continue;
    }

    items.push({
      property_id: row.property_id,
      hotel_name: row.hotel_name,
      district: row.district,
      tags: row.tags.filter((tag): tag is string => typeof tag === 'string'),
    });
  }

  return items.length > 0 ? items : null;
}
