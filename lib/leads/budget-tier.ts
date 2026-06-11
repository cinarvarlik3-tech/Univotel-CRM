/**
 * Budget tier slugs (Chatwoot butce list) and rec-engine budget_max derivation.
 */
import { BUDGET_TIERS, type BudgetTier } from '@/lib/constants';

/** Upper-bound TRY estimate per tier for Make.com rec engine (budget_max column). */
export const BUDGET_TIER_REC_MAX: Readonly<Record<BudgetTier, number | null>> = {
  'dusuk-butce': 15_000,
  ortalama: 25_000,
  'yuksek-butce': 35_000,
  'cok-yuksek-butce': 50_000,
  anlasilmiyor: null,
};

/**
 * Derives budget_max from a tier slug for the rec engine.
 * @param tier - budget_tier slug or null when cleared.
 */
export function budgetMaxFromTier(tier: string | null | undefined): number | null {
  if (!tier) return null;
  if (!(BUDGET_TIERS as readonly string[]).includes(tier)) return null;
  return BUDGET_TIER_REC_MAX[tier as BudgetTier];
}

/**
 * Side-effect fields when budget_tier is written.
 * @param tier - New budget_tier value.
 */
export function budgetTierWritePayload(tier: string | null | undefined): {
  budget_tier: string | null;
  budget_max: number | null;
} {
  const normalized = tier ?? null;
  return {
    budget_tier: normalized,
    budget_max: budgetMaxFromTier(normalized),
  };
}
