/**
 * FMS display formatting helpers.
 */

const tryFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

/**
 * Formats a TRY amount for FMS surfaces.
 */
export function formatTry(amount: number): string {
  return tryFormatter.format(amount);
}
