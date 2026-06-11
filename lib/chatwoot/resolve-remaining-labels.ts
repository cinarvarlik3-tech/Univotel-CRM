/**
 * Resolves CRM field values from labels still present on a Chatwoot conversation
 * after one or more labels are removed.
 */
import {
  CHATWOOT_24H_RESTRICTED_LABEL,
  CHATWOOT_DEAL_AWAITING_LABEL,
  CHATWOOT_DORM_AWAITING_LABELS,
  CHATWOOT_FUNNEL_LABELS,
  CHATWOOT_LABEL_IS_ORGANIC,
  CHATWOOT_LEAD_SOURCE_LABELS,
  CHATWOOT_MESSAGE_FROM_LABELS,
  CHATWOOT_PERSONA_LABELS,
  CHATWOOT_REFERRAL_DOMAIN_LABELS,
  CHATWOOT_SPECIAL_STATE_LABELS,
  CHATWOOT_STUDENT_STAGE_LABELS,
  CHATWOOT_UNI_YEAR_LABELS,
  DEFAULT_FUNNEL_STATUS,
  DEFAULT_STUDENT_STAGE,
  resolveStudentStageFromChatwootLabel,
} from '@/lib/constants';

/** CRM fields driven by a single Chatwoot label slug (excluding multi-value dorm_awaiting). */
export type SingleValueLabelField =
  | 'funnel_status'
  | 'student_stage'
  | 'persona_type'
  | 'special_state'
  | 'message_from'
  | 'lead_source'
  | 'is_organic'
  | 'uni_year'
  | 'referral_domain'
  | 'deal_awaiting'
  | 'is_24h_restricted';

const LABEL_FIELD_DEFAULTS: Readonly<Record<SingleValueLabelField, string | boolean | null>> = {
  funnel_status: DEFAULT_FUNNEL_STATUS,
  student_stage: DEFAULT_STUDENT_STAGE,
  persona_type: null,
  special_state: null,
  message_from: null,
  lead_source: null,
  is_organic: null,
  uni_year: null,
  referral_domain: null,
  deal_awaiting: false,
  is_24h_restricted: false,
};

/** Default CRM value when no label of the category remains on the conversation. */
export function defaultLabelFieldValue(field: SingleValueLabelField): string | boolean | null {
  return LABEL_FIELD_DEFAULTS[field];
}

/**
 * True when a Chatwoot label maps to the given CRM single-value field.
 */
export function labelMapsToField(label: string, field: SingleValueLabelField): boolean {
  switch (field) {
    case 'funnel_status':
      return CHATWOOT_FUNNEL_LABELS.has(label);
    case 'student_stage':
      return CHATWOOT_STUDENT_STAGE_LABELS.has(label);
    case 'persona_type':
      return CHATWOOT_PERSONA_LABELS.has(label);
    case 'special_state':
      return CHATWOOT_SPECIAL_STATE_LABELS.has(label);
    case 'message_from':
      return CHATWOOT_MESSAGE_FROM_LABELS.has(label);
    case 'lead_source':
      return CHATWOOT_LEAD_SOURCE_LABELS.has(label);
    case 'is_organic':
      return label in CHATWOOT_LABEL_IS_ORGANIC;
    case 'uni_year':
      return CHATWOOT_UNI_YEAR_LABELS.has(label);
    case 'referral_domain':
      return CHATWOOT_REFERRAL_DOMAIN_LABELS.has(label);
    case 'deal_awaiting':
      return label === CHATWOOT_DEAL_AWAITING_LABEL;
    case 'is_24h_restricted':
      return label === CHATWOOT_24H_RESTRICTED_LABEL;
    default:
      return false;
  }
}

/**
 * Maps a Chatwoot label slug to the CRM value for a single-value field.
 */
export function mapLabelToFieldValue(
  label: string,
  field: SingleValueLabelField,
): string | boolean | null {
  switch (field) {
    case 'funnel_status':
      return CHATWOOT_FUNNEL_LABELS.has(label) ? label : null;
    case 'student_stage':
      return resolveStudentStageFromChatwootLabel(label) ?? null;
    case 'persona_type':
      return CHATWOOT_PERSONA_LABELS.has(label) ? label : null;
    case 'special_state':
      return CHATWOOT_SPECIAL_STATE_LABELS.has(label) ? label : null;
    case 'message_from':
      return CHATWOOT_MESSAGE_FROM_LABELS.has(label) ? label : null;
    case 'lead_source':
      return CHATWOOT_LEAD_SOURCE_LABELS.has(label) ? label : null;
    case 'is_organic':
      return label in CHATWOOT_LABEL_IS_ORGANIC ? CHATWOOT_LABEL_IS_ORGANIC[label] : null;
    case 'uni_year':
      return CHATWOOT_UNI_YEAR_LABELS.has(label) ? label : null;
    case 'referral_domain':
      return CHATWOOT_REFERRAL_DOMAIN_LABELS.has(label) ? label : null;
    case 'deal_awaiting':
      return label === CHATWOOT_DEAL_AWAITING_LABEL ? true : null;
    case 'is_24h_restricted':
      return label === CHATWOOT_24H_RESTRICTED_LABEL ? true : null;
    default:
      return null;
  }
}

/**
 * Picks the CRM value for a field from labels still on the conversation.
 * When multiple labels of the same category remain, the last one in the array wins.
 */
export function resolveValueFromRemainingLabels(
  field: SingleValueLabelField,
  remainingLabels: readonly string[],
): string | boolean | null {
  let resolved: string | boolean | null = null;

  for (const label of remainingLabels) {
    if (!labelMapsToField(label, field)) continue;
    const value = mapLabelToFieldValue(label, field);
    if (value !== null) resolved = value;
  }

  return resolved;
}

/**
 * Resolves a field after its active label was removed: remaining label of the same
 * category, or the field default when none are left.
 */
export function resolveFieldAfterLabelRemoval(
  field: SingleValueLabelField,
  remainingLabels: readonly string[],
): string | boolean | null {
  const fromRemaining = resolveValueFromRemainingLabels(field, remainingLabels);
  if (fromRemaining !== null) return fromRemaining;
  return defaultLabelFieldValue(field);
}

/** Dorm-awaiting labels still present after a removal (order preserved). */
export function resolveDormAwaitingFromRemainingLabels(
  remainingLabels: readonly string[],
): string[] {
  return remainingLabels.filter((label) => CHATWOOT_DORM_AWAITING_LABELS.has(label));
}
