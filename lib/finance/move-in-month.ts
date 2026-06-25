/** YYYY-MM pattern for contract pricing month (not exact move-in date). */
export const MOVE_IN_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Default move-in month for new finance contracts (current calendar month). */
export function defaultMoveInMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Normalizes YYYY-MM to the first day of that month for Postgres DATE. */
export function toMoveInMonthDate(moveInMonth: string): string {
  if (!MOVE_IN_MONTH_RE.test(moveInMonth)) {
    throw new Error('Taşınma ayı YYYY-MM formatında olmalıdır');
  }
  return `${moveInMonth}-01`;
}

/** Converts active_finance move_in_month DATE to YYYY-MM for form controls. */
export function moveInMonthFromDate(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  return date.slice(0, 7);
}
