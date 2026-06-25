/**
 * Applies a flat partner commission rate to a revenue slice (pure, no server deps).
 */
export function applySliceCommission(
  revenue: number,
  rate: number,
): { revenue: number; ourCut: number; profit: number } {
  const ourCut = revenue * rate;
  return { revenue, ourCut, profit: revenue - ourCut };
}
