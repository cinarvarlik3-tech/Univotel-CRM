/**
 * Cursor pagination helpers for lead list API.
 */
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@/lib/constants';

/** Parsed cursor pagination parameters. */
export interface CursorParams {
  cursor?: string;
  limit: number;
}

/** Cursor pagination response metadata. */
export interface CursorResponse<T> {
  data: T[];
  nextCursor: string | null;
}

/**
 * Parses cursor and limit from query string parameters.
 * @param query - URL query record from API route.
 * @returns Parsed cursor params with clamped limit.
 */
export function parseCursorParams(
  query: Record<string, string | string[] | undefined>,
): CursorParams {
  const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;
  const rawLimit = typeof query.limit === 'string' ? parseInt(query.limit, 10) : DEFAULT_PAGE_LIMIT;
  const limit = Number.isNaN(rawLimit)
    ? DEFAULT_PAGE_LIMIT
    : Math.min(Math.max(rawLimit, 1), MAX_PAGE_LIMIT);

  return { cursor, limit };
}

/**
 * Builds paginated response with nextCursor from fetched rows.
 * @param rows - Fetched rows (limit + 1 if more pages exist).
 * @param limit - Requested page limit.
 * @param cursorField - Field used as cursor (default created_at).
 * @returns Paginated data and next cursor.
 */
export function buildCursorResponse<T extends Record<string, unknown>>(
  rows: T[],
  limit: number,
  cursorField: keyof T = 'created_at' as keyof T,
): CursorResponse<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = data[data.length - 1];
  const nextCursor =
    hasMore && lastItem ? (String(lastItem[cursorField]) as string) : null;

  return { data, nextCursor };
}
