/**
 * Application constants for SLA deadlines, funnel stages, and query whitelists.
 * Central configuration used across business logic and API routes.
 */

/** SLA deadline configuration per lead source in minutes from creation. */
export const SLA_DEADLINES: Record<
  string,
  { deadlineMinutes: number; atRiskOffsetMinutes: number }
> = {
  netgsm_call: { deadlineMinutes: 5, atRiskOffsetMinutes: 2 },
  whatsapp_call: { deadlineMinutes: 5, atRiskOffsetMinutes: 2 },
  whatsapp: { deadlineMinutes: 30, atRiskOffsetMinutes: 5 },
  instagram: { deadlineMinutes: 30, atRiskOffsetMinutes: 5 },
  manual: { deadlineMinutes: 480, atRiskOffsetMinutes: 30 },
  form: { deadlineMinutes: 60, atRiskOffsetMinutes: 15 },
};

/** Manual toggle for August peak season — reduces all SLAs to 30 minutes. */
export const PEAK_SEASON_ACTIVE = false;

/**
 * Returns whether peak season SLA override is active.
 * @returns True if peak season mode is enabled.
 */
export function isPeakSeasonActive(): boolean {
  return PEAK_SEASON_ACTIVE;
}

/** Peak season SLA override in minutes. */
export const PEAK_SEASON_SLA_MINUTES = 30;

/** Valid funnel status stages for leads (Chatwoot label slugs). */
export const FUNNEL_STATUSES = [
  'yeni',
  'aranacak',
  'arandi',
  'arandi-acmadi',
  'bizi-aradi-konustuk',
  'ziyaret',
  'ziyaret-etmedi',
  'ziyaret-etti',
  'teklif-gonderildi',
  'kapora-alindi',
  'sozlesme-imzalandi',
  'ziyaret-ama-almayacak',
  'ilgilenmiyor',
] as const;

/** Chatwoot funnel labels — same values as FUNNEL_STATUSES. */
export const CHATWOOT_FUNNEL_LABELS = new Set<string>(FUNNEL_STATUSES);

/** Valid lead source identifiers. */
export const LEAD_SOURCES = [
  'whatsapp',
  'instagram',
  'netgsm_call',
  'whatsapp_call',
  'manual',
  'form',
  'google-ads',
  'meta-ads',
  'google-maps',
  'sahibinden',
] as const;

/** Chatwoot paid/organic source labels mapped to lead_source. */
export const CHATWOOT_LEAD_SOURCE_LABELS = new Set<string>([
  'google-ads',
  'meta-ads',
  'google-maps',
  'sahibinden',
]);

/** Valid message_from channel values. */
export const MESSAGE_FROM_VALUES = ['whatsapp', 'instagram', 'netgsm', 'manual', 'form'] as const;

/** Valid special_state values for leads. */
export const SPECIAL_STATES = ['univotelli', 'ogrenci-degil'] as const;

/** Chatwoot special_state labels. */
export const CHATWOOT_SPECIAL_STATE_LABELS = new Set<string>(SPECIAL_STATES);

/** Valid loss reason values when funnel_status is lost. */
export const LOSS_REASONS = [
  'price',
  'location',
  'competitor',
  'no_response',
  'not_student',
  'already_placed',
  'timing',
  'other',
] as const;

/** Auto-archive default when loss_reason is unset on terminal leads. */
export const AUTO_LOSS_REASON = 'sure-asildi' as const;

/** Manual archive outcome values. */
export const ARCHIVE_REASONS = ['won', 'lost'] as const;

/** Loss reasons shown in manual archive modal (excludes auto-only sure-asildi). */
export const MANUAL_LOSS_REASONS = LOSS_REASONS;

/** Filter fields on archived_leads list API. */
export const ARCHIVED_FILTERABLE_COLUMNS: ReadonlySet<string> = new Set([
  'archive_reason',
  'lead_source',
  'assigned_to',
  'archived_at',
]);

/** Sortable columns for archived lead list. */
export const ARCHIVED_SORTABLE_COLUMNS: ReadonlySet<string> = new Set([
  'archived_at',
  'created_at',
  'lead_name',
]);

/** Valid dorm_awaiting array element values. */
export const DORM_AWAITING_VALUES = [
  'kyk-sonuc-bekliyor',
  'universite-yurdu-sonuc-bekliyor',
  'ibb-yurdu-sonuc-bekliyor',
] as const;

/** Chatwoot dorm_awaiting labels (array field on lead_details). */
export const CHATWOOT_DORM_AWAITING_LABELS = new Set<string>(DORM_AWAITING_VALUES);

/** Valid student_stage values for leads. */
export const STUDENT_STAGES = [
  'pre-sinav',
  'yerlesti',
  'yeni-giris',
  'erasmus',
  'unknown',
] as const;

/** Chatwoot student_stage labels. */
export const CHATWOOT_STUDENT_STAGE_LABELS = new Set<string>([
  'pre-sinav',
  'yerlesti',
  'yeni-giris',
  'erasmus',
]);

/** Valid persona_type values for leads. */
export const PERSONA_TYPES = ['ogrenci', 'veli'] as const;

/** Chatwoot persona_type labels. */
export const CHATWOOT_PERSONA_LABELS = new Set<string>(PERSONA_TYPES);

/** Chatwoot message_from channel labels. */
export const CHATWOOT_MESSAGE_FROM_LABELS = new Set<string>([
  'whatsapp',
  'instagram',
  'netgsm',
  'manual',
]);

/** Chatwoot referral_domain labels (source_details JSONB). */
export const CHATWOOT_REFERRAL_DOMAIN_LABELS = new Set<string>([
  'ituyurt',
  'galatasarayyurt',
  'kampushan',
  'academic-house',
]);

/** Chatwoot intent-only labels — no CRM field mapping. */
export const CHATWOOT_INTENT_ONLY_LABELS = new Set<string>(['acil', 'fiyat-soruyor']);

/** Default funnel_status when a funnel label is removed. */
export const DEFAULT_FUNNEL_STATUS = 'yeni' as const;

/** Default student_stage when a stage label is removed. */
export const DEFAULT_STUDENT_STAGE = 'unknown' as const;

/** Valid task_type values. */
export const TASK_TYPES = [
  'callback',
  'follow_up',
  'tour_reminder',
  'document_collection',
  'contract_prep',
  'placement_follow_up',
] as const;

/** Valid uni_year values for lead_details. */
export const UNI_YEARS = ['1-sinif', '2-sinif', '3-sinif', '4-sinif', 'universitede'] as const;

/** Chatwoot uni_year labels. */
export const CHATWOOT_UNI_YEAR_LABELS = new Set<string>(UNI_YEARS);

/** Supported languages for manual lead entry. */
export const LANGUAGES = ['tr', 'en', 'de'] as const;

/** All contact_history interaction_type values from DB CHECK. */
export const INTERACTION_TYPES = [
  'call_success',
  'call_fail',
  'message_sent',
  'message_received',
  'whatsapp_call',
  'status_change',
  'duplicate_submission',
  'reassignment',
  'form_submitted',
  'callback_scheduled',
  'correction',
] as const;

/** Interaction types offered when manually adding contact history. */
export const MANUAL_INTERACTION_TYPES = [
  'message_sent',
  'call_success',
  'call_fail',
  'callback_scheduled',
  'correction',
] as const;

/** Trigram similarity threshold for fuzzy lead search RPC. */
export const TRIGRAM_SIMILARITY_THRESHOLD = 0.3;

/** Filter fields on lead_details table (require embed join). */
export const LEAD_DETAILS_FILTER_FIELDS = [
  'university',
  'budget_min',
  'budget_max',
  'move_in',
  'uni_year',
] as const;

/** Filter fields on leads table root. */
export const LEADS_TABLE_FILTER_FIELDS = [
  'funnel_status',
  'student_stage',
  'lead_source',
  'assigned_to',
  'sla_status',
  'language',
  'persona_type',
  'lead_score',
  'is_organic',
  'created_at',
  'last_contact_at',
  'sla_deadline',
  'lead_name',
  'lead_phone',
] as const;

/** Filter fields exposed in lead list toolbar (leads + lead_details). */
export const LEAD_LIST_FILTER_FIELDS = [
  ...LEADS_TABLE_FILTER_FIELDS,
  ...LEAD_DETAILS_FILTER_FIELDS,
] as const;

/** Days in terminal funnel status before nightly auto-archive (see archive_single_lead SQL). */
export const AUTO_ARCHIVE_CUTOFF_DAYS = 80;

/** Terminal funnel statuses excluded from SLA updates and active lead counts. */
export const TERMINAL_FUNNEL_STATUSES = [
  'sozlesme-imzalandi',
  'ziyaret-ama-almayacak',
  'ilgilenmiyor',
] as const;

/** Maps paid/organic Chatwoot source labels to is_organic. */
export const CHATWOOT_LABEL_IS_ORGANIC: Readonly<Record<string, boolean>> = {
  'google-ads': false,
  'meta-ads': false,
  'google-maps': true,
  sahibinden: true,
};

/** Target for a Chatwoot label → CRM field mapping entry. */
export type LabelFieldTarget =
  | {
      table: 'leads';
      field:
        | 'funnel_status'
        | 'student_stage'
        | 'persona_type'
        | 'special_state'
        | 'message_from'
        | 'lead_source'
        | 'is_organic';
    }
  | { table: 'lead_details'; field: 'uni_year' | 'dorm_awaiting' }
  | { table: 'source_details'; field: 'referral_domain' }
  | { table: 'none' };

/**
 * Maps every Chatwoot label slug to its CRM update target(s).
 * Paid source labels expand to lead_source + is_organic via CHATWOOT_LABEL_IS_ORGANIC.
 */
export function getLabelFieldTargets(label: string): LabelFieldTarget[] {
  if (CHATWOOT_INTENT_ONLY_LABELS.has(label)) {
    return [{ table: 'none' }];
  }
  if (CHATWOOT_FUNNEL_LABELS.has(label)) {
    return [{ table: 'leads', field: 'funnel_status' }];
  }
  if (CHATWOOT_STUDENT_STAGE_LABELS.has(label)) {
    return [{ table: 'leads', field: 'student_stage' }];
  }
  if (CHATWOOT_PERSONA_LABELS.has(label)) {
    return [{ table: 'leads', field: 'persona_type' }];
  }
  if (CHATWOOT_SPECIAL_STATE_LABELS.has(label)) {
    return [{ table: 'leads', field: 'special_state' }];
  }
  if (CHATWOOT_MESSAGE_FROM_LABELS.has(label)) {
    return [{ table: 'leads', field: 'message_from' }];
  }
  if (CHATWOOT_LEAD_SOURCE_LABELS.has(label)) {
    const targets: LabelFieldTarget[] = [{ table: 'leads', field: 'lead_source' }];
    if (label in CHATWOOT_LABEL_IS_ORGANIC) {
      targets.push({ table: 'leads', field: 'is_organic' });
    }
    return targets;
  }
  if (CHATWOOT_UNI_YEAR_LABELS.has(label)) {
    return [{ table: 'lead_details', field: 'uni_year' }];
  }
  if (CHATWOOT_DORM_AWAITING_LABELS.has(label)) {
    return [{ table: 'lead_details', field: 'dorm_awaiting' }];
  }
  if (CHATWOOT_REFERRAL_DOMAIN_LABELS.has(label)) {
    return [{ table: 'source_details', field: 'referral_domain' }];
  }
  return [];
}

/** All Chatwoot labels that have a CRM mapping (excluding intent-only). */
export const LABEL_TO_FIELD_MAP: Readonly<Record<string, LabelFieldTarget[]>> = (() => {
  const allLabels = [
    ...CHATWOOT_FUNNEL_LABELS,
    ...CHATWOOT_STUDENT_STAGE_LABELS,
    ...CHATWOOT_PERSONA_LABELS,
    ...CHATWOOT_SPECIAL_STATE_LABELS,
    ...CHATWOOT_MESSAGE_FROM_LABELS,
    ...CHATWOOT_LEAD_SOURCE_LABELS,
    ...CHATWOOT_UNI_YEAR_LABELS,
    ...CHATWOOT_DORM_AWAITING_LABELS,
    ...CHATWOOT_REFERRAL_DOMAIN_LABELS,
    ...CHATWOOT_INTENT_ONLY_LABELS,
  ];
  const map: Record<string, LabelFieldTarget[]> = {};
  for (const label of allLabels) {
    map[label] = getLabelFieldTargets(label);
  }
  return map;
})();

/** Columns allowed in dynamic filter builder queries. */
export const FILTERABLE_COLUMNS: ReadonlySet<string> = new Set([
  'funnel_status',
  'student_stage',
  'lead_source',
  'assigned_to',
  'sla_status',
  'lead_score',
  'language',
  'persona_type',
  'is_organic',
  'created_at',
  'last_contact_at',
  'sla_deadline',
  'lead_name',
  'lead_phone',
  'university',
  'budget_min',
  'budget_max',
  'move_in',
  'uni_year',
]);

/** Columns allowed for single-column sort on lead list. */
export const SORTABLE_COLUMNS: ReadonlySet<string> = new Set([
  'created_at',
  'sla_deadline',
  'lead_score',
  'lead_name',
  'funnel_status',
]);

/** Sortable columns as array for UI dropdowns. */
export const SORTABLE_COLUMN_OPTIONS = Array.from(SORTABLE_COLUMNS);

/** Default pagination limit for list endpoints. */
export const DEFAULT_PAGE_LIMIT = 50;

/** Maximum pagination limit for list endpoints. */
export const MAX_PAGE_LIMIT = 100;

/** Istanbul timezone identifier for shift and display logic. */
export const ISTANBUL_TIMEZONE = 'Europe/Istanbul';

/** Internal retry delays in milliseconds for webhook processing. */
export const RETRY_DELAYS_MS = [0, 5000, 15000] as const;
