/** localStorage key for analytics calculation-notes toggle (default on). */
export const CALC_NOTES_STORAGE_KEY = 'univotel-analytics-calc-notes';

/** Reads calc-notes preference; defaults to true when key absent. */
export function readCalcNotesEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(CALC_NOTES_STORAGE_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

/** Persists calc-notes preference. */
export function writeCalcNotesEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CALC_NOTES_STORAGE_KEY, String(enabled));
}
