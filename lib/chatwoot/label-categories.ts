/**
 * Chatwoot label category sets for outbound label rebuild (one slug per category except dorm).
 */
import {
  CHATWOOT_DORM_AWAITING_LABELS,
  CHATWOOT_FUNNEL_LABELS,
  CHATWOOT_INTENT_ONLY_LABELS,
  CHATWOOT_LEAD_SOURCE_LABELS,
  CHATWOOT_MESSAGE_FROM_LABELS,
  CHATWOOT_PERSONA_LABELS,
  CHATWOOT_REFERRAL_DOMAIN_LABELS,
  CHATWOOT_SPECIAL_STATE_LABELS,
  CHATWOOT_STUDENT_STAGE_LABELS,
  CHATWOOT_UNI_YEAR_LABELS,
} from '@/lib/constants';

/** All managed label slugs (excludes intent-only). */
export const MANAGED_CHATWOOT_LABELS = new Set<string>([
  ...CHATWOOT_FUNNEL_LABELS,
  ...CHATWOOT_STUDENT_STAGE_LABELS,
  ...CHATWOOT_PERSONA_LABELS,
  ...CHATWOOT_SPECIAL_STATE_LABELS,
  ...CHATWOOT_MESSAGE_FROM_LABELS,
  ...CHATWOOT_LEAD_SOURCE_LABELS,
  ...CHATWOOT_UNI_YEAR_LABELS,
  ...CHATWOOT_DORM_AWAITING_LABELS,
  ...CHATWOOT_REFERRAL_DOMAIN_LABELS,
]);

/** CRM lead row used to build outbound Chatwoot labels. */
export interface CrmLabelState {
  funnel_status: string;
  student_stage: string;
  persona_type: string | null;
  special_state: string | null;
  message_from: string | null;
  lead_source: string;
  source_details: Record<string, unknown> | null;
  uni_year?: string | null;
  dorm_awaiting?: string[];
}

/**
 * Removes managed labels from a list, preserving intent-only and unknown labels.
 */
export function stripManagedLabels(current: string[]): string[] {
  return current.filter(
    (label) => !MANAGED_CHATWOOT_LABELS.has(label) || CHATWOOT_INTENT_ONLY_LABELS.has(label),
  );
}

/**
 * Builds the managed label slugs that reflect current CRM field values.
 */
export function buildManagedLabelsFromCrm(state: CrmLabelState): string[] {
  const labels: string[] = [];

  if (CHATWOOT_FUNNEL_LABELS.has(state.funnel_status)) {
    labels.push(state.funnel_status);
  }
  if (CHATWOOT_STUDENT_STAGE_LABELS.has(state.student_stage)) {
    labels.push(state.student_stage);
  }
  if (state.persona_type && CHATWOOT_PERSONA_LABELS.has(state.persona_type)) {
    labels.push(state.persona_type);
  }
  if (state.special_state && CHATWOOT_SPECIAL_STATE_LABELS.has(state.special_state)) {
    labels.push(state.special_state);
  }
  if (state.message_from && CHATWOOT_MESSAGE_FROM_LABELS.has(state.message_from)) {
    labels.push(state.message_from);
  }
  if (CHATWOOT_LEAD_SOURCE_LABELS.has(state.lead_source)) {
    labels.push(state.lead_source);
  }
  if (state.uni_year && CHATWOOT_UNI_YEAR_LABELS.has(state.uni_year)) {
    labels.push(state.uni_year);
  }
  for (const dorm of state.dorm_awaiting ?? []) {
    if (CHATWOOT_DORM_AWAITING_LABELS.has(dorm)) {
      labels.push(dorm);
    }
  }
  const referralDomain = state.source_details?.referral_domain;
  if (typeof referralDomain === 'string' && CHATWOOT_REFERRAL_DOMAIN_LABELS.has(referralDomain)) {
    labels.push(referralDomain);
  }

  return labels;
}

/**
 * Merges intent-only labels from Chatwoot with CRM-managed labels.
 */
export function mergeOutboundLabels(
  currentChatwootLabels: string[],
  crmState: CrmLabelState,
): string[] {
  const preserved = currentChatwootLabels.filter(
    (label) => CHATWOOT_INTENT_ONLY_LABELS.has(label) || !MANAGED_CHATWOOT_LABELS.has(label),
  );
  const managed = buildManagedLabelsFromCrm(crmState);
  return [...new Set([...preserved, ...managed])];
}
