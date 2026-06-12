/**
 * Application constants for SLA deadlines, funnel stages, and query whitelists.
 * Central configuration used across business logic and API routes.
 */

/** Istanbul SLA window — status updates and alerts run 09:00–17:00 only. */
export const SLA_BUSINESS_HOUR_START = '09:00';
export const SLA_BUSINESS_HOUR_END = '17:00';

/** Standard SLA duration in minutes once counting starts (within business hours). */
export const SLA_DEADLINE_MINUTES = 60;

/** Manual toggle for August peak season — reduces all SLAs to 30 minutes. */
/** Poll interval while active lead Conversation tab is open (Chatwoot live sync). */
export const LEAD_CHAT_SYNC_POLL_MS = 15_000;

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
  'bilgi-verildi',
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
  'lost',
] as const;

/** Terminal "lost" funnel status set via Chatwoot kayip_nedeni custom attribute. */
export const LOST_FUNNEL_STATUS = 'lost' as const;

/** Terminal funnel statuses — auto-advance must never target or originate from these. */
export const TERMINAL_FUNNEL_STATUSES_SET = new Set<string>(['lost', 'sozlesme-imzalandi']);

/**
 * Forward-only stage comparator for CDR auto-advance (§1.7 / D19).
 * Returns true if `target` is strictly ahead of `current` in the funnel order,
 * and neither stage is terminal (lost / sozlesme-imzalandi).
 * Safe to use from webhook handlers — throws never.
 */
export function isFunnelAdvanceAllowed(current: string, target: string): boolean {
  if (TERMINAL_FUNNEL_STATUSES_SET.has(current) || TERMINAL_FUNNEL_STATUSES_SET.has(target)) {
    return false;
  }
  const currentIdx = FUNNEL_STATUSES.indexOf(current as (typeof FUNNEL_STATUSES)[number]);
  const targetIdx = FUNNEL_STATUSES.indexOf(target as (typeof FUNNEL_STATUSES)[number]);
  if (currentIdx === -1 || targetIdx === -1) return false;
  return targetIdx > currentIdx;
}

/** Chatwoot funnel label aliases (display labels → CRM slug). */
export const CHATWOOT_FUNNEL_LABEL_ALIASES: Readonly<Record<string, string>> = {
  kayıp: LOST_FUNNEL_STATUS,
  kayip: LOST_FUNNEL_STATUS,
};

/**
 * Normalizes a Chatwoot funnel label to the canonical CRM funnel_status slug.
 * @param label - Raw label from a Chatwoot webhook.
 */
export function normalizeChatwootFunnelLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  const lowerTr = trimmed.toLocaleLowerCase('tr');
  return (
    CHATWOOT_FUNNEL_LABEL_ALIASES[lowerTr] ?? CHATWOOT_FUNNEL_LABEL_ALIASES[trimmed] ?? trimmed
  );
}

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
  'plans_changed',
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

/** Chatwoot label that sets deal_awaiting = true on the leads table. */
export const CHATWOOT_DEAL_AWAITING_LABEL = 'deal_awaiting' as const;

/** Chatwoot label that sets is_24h_restricted = true on the leads table. */
export const CHATWOOT_24H_RESTRICTED_LABEL = '24h_window_warning' as const;

/** Valid student_stage values for leads. */
export const STUDENT_STAGES = [
  'pre-sinav',
  'yerlesti',
  'yeni-giris',
  'erasmus',
  'yatay-gecis-bekliyor',
  'unknown',
] as const;

/**
 * Maps inbound Chatwoot student-stage label slugs to canonical CRM student_stage values.
 * Includes Turkish-character and spacing variants used in Chatwoot.
 */
export const CHATWOOT_STUDENT_STAGE_LABEL_MAP: Readonly<Record<string, string>> = {
  'pre-sinav': 'pre-sinav',
  pre_sinav: 'pre-sinav',
  erasmus: 'erasmus',
  yerlesti: 'yerlesti',
  yerleşti: 'yerlesti',
  'yeni-giris': 'yeni-giris',
  'yeni-giriş': 'yeni-giris',
  yeni_giriş: 'yeni-giris',
  'yeni giriş': 'yeni-giris',
  yatay_geçiş_bekliyor: 'yatay-gecis-bekliyor',
  yatay_gecis_bekliyor: 'yatay-gecis-bekliyor',
  'yatay-gecis-bekliyor': 'yatay-gecis-bekliyor',
};

/** Outbound Chatwoot label when it differs from the canonical CRM student_stage slug. */
export const CHATWOOT_STUDENT_STAGE_OUTBOUND_LABEL: Readonly<Partial<Record<string, string>>> = {
  'yatay-gecis-bekliyor': 'yatay_geçiş_bekliyor',
};

/** All Chatwoot label slugs that map to student_stage (includes alias keys). */
export const CHATWOOT_STUDENT_STAGE_LABELS = new Set<string>(
  Object.keys(CHATWOOT_STUDENT_STAGE_LABEL_MAP),
);

/**
 * Resolves a Chatwoot label slug to the canonical CRM student_stage value.
 * @param label - Chatwoot label slug from webhook or API.
 * @returns Canonical student_stage or undefined when not a stage label.
 */
export function resolveStudentStageFromChatwootLabel(label: string): string | undefined {
  return CHATWOOT_STUDENT_STAGE_LABEL_MAP[label];
}

/**
 * Resolves the Chatwoot label slug to push for a CRM student_stage value.
 * @param stage - Canonical CRM student_stage slug.
 * @returns Chatwoot label slug, or undefined for unknown / non-synced stages.
 */
export function resolveChatwootLabelFromStudentStage(stage: string): string | undefined {
  if (stage === 'unknown') return undefined;
  if (!(STUDENT_STAGES as readonly string[]).includes(stage)) return undefined;
  return CHATWOOT_STUDENT_STAGE_OUTBOUND_LABEL[stage] ?? stage;
}

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
export const UNI_YEARS = [
  'hazirlik',
  '1-sinif',
  '2-sinif',
  '3-sinif',
  '4-sinif',
  '5-sinif',
  '6-sinif',
  'universitede',
] as const;

/** Valid student_gender values for lead_details. */
export const STUDENT_GENDER_VALUES = ['male', 'female', 'other'] as const;

/** Valid room_category values for hotel recommendation. */
export const ROOM_CATEGORY_VALUES = ['single', 'double', 'triple', 'quad'] as const;

/** Chatwoot butce fixed-list tier slugs stored in lead_details.budget_tier. */
export const BUDGET_TIERS = [
  'dusuk-butce',
  'ortalama',
  'yuksek-butce',
  'cok-yuksek-butce',
  'anlasilmiyor',
] as const;

export type BudgetTier = (typeof BUDGET_TIERS)[number];

/** Tri-state presence filter values for nullable field UI controls. */
export const PRESENCE_FILTER_VALUES = ['any', 'yes', 'no'] as const;

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
  'budget_tier',
  'move_in',
  'uni_year',
  'student_gender',
  'preferred_district',
  'district_preference',
  'campus',
  'room_category',
  'nationality',
  'parent_name',
  'school_shortname',
  'kvkk_opt_in',
  'marketing_opt_in',
  'dorm_awaiting',
  'interested_hotel',
  'room_type',
  'rec_hotel',
] as const;

/** Filter fields on leads table root. */
export const LEADS_TABLE_FILTER_FIELDS = [
  'funnel_status',
  'student_stage',
  'lead_source',
  'message_from',
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
  'special_state',
  'loss_reason',
  'parent_phone',
  'deal_awaiting',
  'notes',
  'has_moved_in',
  'is_24h_restricted',
  'move_in_date_set',
] as const;

/** Filter fields exposed in lead list toolbar (leads + lead_details). */
export const LEAD_LIST_FILTER_FIELDS = [
  ...LEADS_TABLE_FILTER_FIELDS,
  ...LEAD_DETAILS_FILTER_FIELDS,
] as const;

/** Days in terminal funnel status before nightly auto-archive (see archive_single_lead SQL). */
export const AUTO_ARCHIVE_CUTOFF_DAYS = 80;

/** Terminal funnel statuses used for SLA exclusion. */
export const TERMINAL_FUNNEL_STATUSES = ['sozlesme-imzalandi', 'lost'] as const;

/**
 * Funnel stages grouped into named compartments for the kanban compartment view.
 * 'lost' and boolean-state leads (is_24h_restricted, has_moved_in) are excluded.
 */
export const FUNNEL_COMPARTMENTS: Readonly<Record<string, string[]>> = {
  cold: ['yeni'],
  'expecting-call': ['aranacak', 'arandi-acmadi'],
  nurture: ['arandi', 'bilgi-verildi', 'bizi-aradi-konustuk'],
  'will-visit': ['ziyaret'],
  'failed-visit': ['ziyaret-etmedi'],
  'post-visit-nurture': ['ziyaret-etti', 'teklif-gonderildi'],
  downpayment: ['kapora-alindi'],
  'deal-signed': ['sozlesme-imzalandi'],
};

/**
 * "Irrelevant" leads are hidden from default views; shown only with the "Show All Leads" toggle.
 * Applies to funnel_status values and the boolean flags below.
 */
export const IRRELEVANT_FUNNEL_STATUSES = ['lost', 'sozlesme-imzalandi'] as const;

/** visit status values for the visits table. */
export const VISIT_STATUSES = ['scheduled', 'attended', 'failed'] as const;

/** auto_task_type values for the tasks table. */
export const AUTO_TASK_TYPES = [
  'nurture_reminder',
  'post_visit_nurture_reminder',
  'visit_reminder',
  'move_in_reminder',
  'visit_resolution',
  'failed_visit_followup',
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
        | 'is_organic'
        | 'deal_awaiting'
        | 'is_24h_restricted';
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
  if (label === CHATWOOT_DEAL_AWAITING_LABEL) {
    return [{ table: 'leads', field: 'deal_awaiting' }];
  }
  if (label === CHATWOOT_24H_RESTRICTED_LABEL) {
    return [{ table: 'leads', field: 'is_24h_restricted' }];
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
    CHATWOOT_DEAL_AWAITING_LABEL,
    CHATWOOT_24H_RESTRICTED_LABEL,
  ];
  const map: Record<string, LabelFieldTarget[]> = {};
  for (const label of allLabels) {
    map[label] = getLabelFieldTargets(label);
  }
  return map;
})();

/** Columns allowed in dynamic filter builder queries (active leads + campaigns). */
export const FILTERABLE_COLUMNS: ReadonlySet<string> = new Set(LEAD_LIST_FILTER_FIELDS);

/** Columns allowed for single-column sort on lead list. */
export const SORTABLE_COLUMNS: ReadonlySet<string> = new Set([
  'created_at',
  'last_contact_at',
  'sla_deadline',
  'lead_score',
  'lead_name',
  'funnel_status',
]);

/** Sortable columns as array for UI dropdowns. */
export const SORTABLE_COLUMN_OPTIONS = Array.from(SORTABLE_COLUMNS);

/** Filter fields on old_lead_details table (require embed join). */
export const OLD_LEAD_DETAILS_FILTER_FIELDS = [
  'university',
  'budget_min',
  'budget_max',
  'move_in',
  'uni_year',
  'student_gender',
  'preferred_district',
  'nationality',
  'parent_name',
  'kvkk_opt_in',
  'marketing_opt_in',
  'dorm_awaiting',
  'interested_hotel',
  'room_type',
  'rec_hotel',
] as const;

/** Filter fields on old_leads table root. */
export const OLD_LEADS_TABLE_FILTER_FIELDS = [
  'funnel_status',
  'student_stage',
  'lead_source',
  'message_from',
  'assigned_to',
  'language',
  'persona_type',
  'lead_score',
  'is_organic',
  'created_at',
  'last_contact_at',
  'lead_name',
  'lead_phone',
  'special_state',
  'loss_reason',
  'parent_phone',
] as const;

/** Filter fields exposed in old lead list toolbar. */
export const OLD_LEAD_LIST_FILTER_FIELDS = [
  ...OLD_LEADS_TABLE_FILTER_FIELDS,
  ...OLD_LEAD_DETAILS_FILTER_FIELDS,
] as const;

/** Columns allowed in old leads dynamic filter queries. */
export const OLD_FILTERABLE_COLUMNS: ReadonlySet<string> = new Set(OLD_LEAD_LIST_FILTER_FIELDS);

/** Columns allowed for single-column sort on old lead list. */
export const OLD_SORTABLE_COLUMNS: ReadonlySet<string> = new Set([
  'created_at',
  'last_contact_at',
  'lead_score',
  'lead_name',
  'funnel_status',
]);

/** Sortable old lead columns as array for UI dropdowns. */
export const OLD_SORTABLE_COLUMN_OPTIONS = Array.from(OLD_SORTABLE_COLUMNS);

/** Default pagination limit for list endpoints. */
export const DEFAULT_PAGE_LIMIT = 50;

/** Maximum pagination limit for list endpoints. */
export const MAX_PAGE_LIMIT = 100;

/** Istanbul timezone identifier for shift and display logic. */
export const ISTANBUL_TIMEZONE = 'Europe/Istanbul';

/** Internal retry delays in milliseconds for webhook processing. */
export const RETRY_DELAYS_MS = [0, 5000, 15000] as const;

/** Şirket sabit hat numarası (E.164 formatında). CDR kayıtlarında arayan/aranan tespiti için kullanılır. */
export const COMPANY_PHONE_NUMBER = '+90 212 909 52 44';

/**
 * Şirket sabit hattının normalize edilmiş hali.
 * normalizePhone(COMPANY_PHONE_NUMBER).phone ile aynı sonucu verir:
 * '+90 212 909 52 44' → '02129095244'
 * Lead numaralarıyla aynı formatta karşılaştırılabilmesi için sabit olarak tanımlandı.
 */
export const COMPANY_PHONE_NUMBER_NORMALIZED = '02129095244';

/** Default stale warning threshold in days — based on last_contact_at. */
export const STALE_THRESHOLD_DAYS_DEFAULT = 7;

/**
 * Per-stage stale thresholds (days since last_contact_at).
 * All default to 7 — to be tuned by product owner per stage.
 */
export const STALE_THRESHOLDS_BY_STAGE: Readonly<Record<string, number>> = {
  yeni: 7,
  'bilgi-verildi': 7,
  aranacak: 7,
  arandi: 7,
  'arandi-acmadi': 7,
  'bizi-aradi-konustuk': 7,
  ziyaret: 7,
  'ziyaret-etmedi': 7,
  'ziyaret-etti': 7,
  'teklif-gonderildi': 7,
  'kapora-alindi': 7,
  'sozlesme-imzalandi': 7,
  lost: 7,
};
