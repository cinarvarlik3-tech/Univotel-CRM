/**
 * Applies funnel_status transitions when loss_reason is set or cleared manually.
 */
import { DEFAULT_FUNNEL_STATUS, LOST_FUNNEL_STATUS } from '@/lib/constants';

export const FINANCIAL_FUNNEL_STATUSES = ['kapora-alindi', 'sozlesme-imzalandi'] as const;
export type FinancialFunnelStatus = (typeof FINANCIAL_FUNNEL_STATUSES)[number];

export interface LeadLossContext {
  funnel_status: string;
  funnel_status_before_lost?: string | null;
  loss_reason?: string | null;
}

export function isFinancialFunnelStatus(status: string): status is FinancialFunnelStatus {
  return (FINANCIAL_FUNNEL_STATUSES as readonly string[]).includes(status);
}

/**
 * When clearing loss_reason on a lost lead, returns the financial stage being
 * restored (if any). Recovery into a financial stage requires fresh finance inputs.
 */
export function getLossRecoveryFinancialTarget(
  existing: LeadLossContext,
  updates: { loss_reason?: string | null },
): FinancialFunnelStatus | null {
  if (!('loss_reason' in updates) || updates.loss_reason !== null) return null;
  if (existing.funnel_status !== LOST_FUNNEL_STATUS) return null;
  const target = existing.funnel_status_before_lost ?? DEFAULT_FUNNEL_STATUS;
  return isFinancialFunnelStatus(target) ? target : null;
}

/**
 * Merges funnel_status / funnel_status_before_lost when loss_reason changes via CRM PATCH.
 * Setting loss_reason moves the lead to lost and saves the prior stage.
 * Clearing loss_reason restores the saved stage when the lead is still lost.
 */
export function applyLossReasonUpdate(
  existing: LeadLossContext,
  updates: { loss_reason?: string | null },
): Record<string, unknown> {
  if (!('loss_reason' in updates)) return {};

  const nextLoss = updates.loss_reason ?? null;
  const prevLoss = existing.loss_reason ?? null;
  if (nextLoss === prevLoss) return {};

  if (nextLoss !== null) {
    const merged: Record<string, unknown> = {
      loss_reason: nextLoss,
      funnel_status: LOST_FUNNEL_STATUS,
    };
    if (existing.funnel_status !== LOST_FUNNEL_STATUS) {
      merged.funnel_status_before_lost = existing.funnel_status;
    }
    return merged;
  }

  const merged: Record<string, unknown> = { loss_reason: null };
  if (existing.funnel_status === LOST_FUNNEL_STATUS) {
    merged.funnel_status = existing.funnel_status_before_lost ?? DEFAULT_FUNNEL_STATUS;
    merged.funnel_status_before_lost = null;
  }
  return merged;
}
