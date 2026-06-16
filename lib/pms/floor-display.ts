/**
 * Floor label formatting for PMS room grids (P6).
 * Lowest displayed floor is labeled "1. Kat"; negative floors use hundreds digit numbering.
 */

/**
 * Returns the display label for a signed floor integer.
 * @param floor - Real signed floor from rooms.floor.
 */
export function formatFloorLabel(floor: number): string {
  if (floor >= 1) {
    return `${floor}. Kat`;
  }

  // Negative floors: -3 → 10x display convention per plan (P6).
  const display = Math.abs(floor) * 10;
  return `${display}. Kat`;
}

/**
 * Sort comparator for ascending floor display order (lowest real floor first).
 */
export function compareFloors(a: number, b: number): number {
  return a - b;
}
