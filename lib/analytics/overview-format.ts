/**
 * Display formatters for analytics overview metrics.
 */

/**
 * Formats average response time in minutes as a human-readable duration.
 * @param minutes - Mean minutes; null when no data.
 */
export function formatResponseTimeMinutes(minutes: number | null, emDash = '—'): string {
  if (minutes === null || !Number.isFinite(minutes)) return emDash;
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Formats a ratio as percentage string; guards zero denominator.
 */
export function formatPercent(numerator: number, denominator: number, emDash = '—'): string {
  if (denominator <= 0) return emDash;
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

/**
 * Median of numeric array; returns null for empty input.
 */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}
