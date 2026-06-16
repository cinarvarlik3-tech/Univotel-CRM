/**
 * Maps Postgres PMS placement trigger exceptions to Turkish user messages.
 */

const TYPE_MISMATCH = 'PLACEMENT_TYPE_MISMATCH';
const ROOM_AT_CAPACITY = 'ROOM_AT_CAPACITY';

/** Parsed placement error for API responses. */
export interface PmsPlacementError {
  code: 'TYPE_MISMATCH' | 'ROOM_AT_CAPACITY' | 'UNKNOWN';
  message: string;
  status: number;
}

/**
 * Converts a database error message into a user-facing PMS placement error.
 * @param err - Caught error from placement write.
 */
export function mapPlacementTriggerError(err: unknown): PmsPlacementError {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes(TYPE_MISMATCH)) {
    return {
      code: 'TYPE_MISMATCH',
      message: 'Satın alınan oda tipi eşleşmiyor',
      status: 409,
    };
  }

  if (raw.includes(ROOM_AT_CAPACITY)) {
    return {
      code: 'ROOM_AT_CAPACITY',
      message: 'Oda dolu',
      status: 409,
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'Yerleştirme işlemi başarısız',
    status: 500,
  };
}
