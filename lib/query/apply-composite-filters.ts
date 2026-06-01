/**
 * Applies filters that cannot be expressed as a single PostgREST column operator.
 */
import type { CompositeFilterableQuery } from '@/lib/query/supabase-query-types';

/** Parsed composite filter flags from query string. */
export interface CompositeFilterFlags {
  /** Old leads: rec_hotel text must be non-null and non-empty. */
  oldRecHotelPresent?: boolean;
  /** Old leads: rec_hotel is null or empty string. */
  oldRecHotelAbsent?: boolean;
}

/**
 * Reads composite filter flags from API query params.
 * @param query - Next.js request query.
 * @returns Composite filter flags.
 */
export function parseCompositeFilterFlags(
  query: Record<string, string | string[] | undefined>,
): CompositeFilterFlags {
  const raw = query.composite;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return {};

  const flags: CompositeFilterFlags = {};
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (trimmed === 'old_rec_hotel_present') flags.oldRecHotelPresent = true;
    if (trimmed === 'old_rec_hotel_absent') flags.oldRecHotelAbsent = true;
  }
  return flags;
}

/**
 * Applies old-lead rec_hotel presence filters (TEXT column — empty string counts as absent).
 * @param query - Supabase query builder after standard filters.
 * @param embedPrefix - Embed path prefix (old_lead_details).
 * @param flags - Parsed composite flags.
 * @returns Modified query builder.
 */
export function applyOldLeadRecHotelComposite<T extends CompositeFilterableQuery>(
  query: T,
  embedPrefix: string,
  flags: CompositeFilterFlags,
): T {
  let result: CompositeFilterableQuery = query;
  const column = `${embedPrefix}.rec_hotel`;

  if (flags.oldRecHotelPresent) {
    result = result.not(column, 'is', null).filter(column, 'neq', '');
  }

  if (flags.oldRecHotelAbsent) {
    result = result.or(`${column}.is.null,${column}.eq.`);
  }

  return result as T;
}
