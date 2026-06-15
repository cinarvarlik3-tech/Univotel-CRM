/**
 * Filter field registry — mirrors side-panel Genel / Profil / Detay / Sistem sections.
 */
import {
  BUDGET_TIERS,
  DORM_AWAITING_VALUES,
  FUNNEL_STATUSES,
  LANGUAGES,
  LEAD_SOURCES,
  LOSS_REASONS,
  MESSAGE_FROM_VALUES,
  OLD_LEAD_LIST_FILTER_FIELDS,
  PERSONA_TYPES,
  ROOM_CATEGORY_VALUES,
  SPECIAL_STATES,
  STUDENT_GENDER_VALUES,
  STUDENT_STAGES,
  UNI_YEARS,
} from '@/lib/constants';

export type FilterSection = 'genel' | 'profil' | 'detay' | 'sistem';

export type FilterControlKind =
  | 'enum'
  | 'boolean'
  | 'text'
  | 'multiselect'
  | 'number'
  | 'date'
  | 'assignee'
  | 'university';

export interface FilterFieldDef {
  id: string;
  section: FilterSection;
  labelKey: string;
  table: 'leads' | 'lead_details';
  kind: FilterControlKind;
  /** Enum option slugs; labels resolved via formatEnumLabel in UI. */
  enumGroup?: string;
  options?: readonly string[];
  supportsFuzzy?: boolean;
  supportsDatetime?: boolean;
  /** Managers-only (assignee). */
  managerOnly?: boolean;
}

const genelFields: FilterFieldDef[] = [
  {
    id: 'funnel_status',
    section: 'genel',
    labelKey: 'leads.funnelStatus',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'funnel',
    options: FUNNEL_STATUSES,
  },
  {
    id: 'persona_type',
    section: 'genel',
    labelKey: 'leads.persona',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'persona',
    options: PERSONA_TYPES,
  },
  {
    id: 'student_gender',
    section: 'genel',
    labelKey: 'leads.cinsiyet',
    table: 'lead_details',
    kind: 'enum',
    enumGroup: 'gender',
    options: STUDENT_GENDER_VALUES,
  },
  {
    id: 'parent_phone',
    section: 'genel',
    labelKey: 'leads.veliOgrenciTelefonu',
    table: 'leads',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'student_stage',
    section: 'genel',
    labelKey: 'leads.studentStage',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'stage',
    options: STUDENT_STAGES,
  },
  {
    id: 'special_state',
    section: 'genel',
    labelKey: 'leads.specialState',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'special',
    options: SPECIAL_STATES,
  },
  {
    id: 'dorm_awaiting',
    section: 'genel',
    labelKey: 'leads.dormStage',
    table: 'lead_details',
    kind: 'multiselect',
    enumGroup: 'dorm',
    options: DORM_AWAITING_VALUES,
  },
  {
    id: 'deal_awaiting',
    section: 'genel',
    labelKey: 'leads.dealAwaiting',
    table: 'leads',
    kind: 'boolean',
  },
  {
    id: 'notes',
    section: 'genel',
    labelKey: 'leads.notes',
    table: 'leads',
    kind: 'text',
    supportsFuzzy: true,
  },
];

const profilFields: FilterFieldDef[] = [
  {
    id: 'parent_name',
    section: 'profil',
    labelKey: 'leads.veliOgrenciIsmi',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'university',
    section: 'profil',
    labelKey: 'leads.universityName',
    table: 'lead_details',
    kind: 'university',
    supportsFuzzy: true,
  },
  {
    id: 'school_shortname',
    section: 'profil',
    labelKey: 'leads.schoolShortname',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'uni_year',
    section: 'profil',
    labelKey: 'leads.schoolYear',
    table: 'lead_details',
    kind: 'enum',
    enumGroup: 'uniYear',
    options: UNI_YEARS,
  },
  {
    id: 'budget_tier',
    section: 'profil',
    labelKey: 'filters.budgetTier',
    table: 'lead_details',
    kind: 'enum',
    enumGroup: 'budgetTier',
    options: BUDGET_TIERS,
  },
  {
    id: 'language',
    section: 'profil',
    labelKey: 'filters.language',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'language',
    options: LANGUAGES,
  },
  {
    id: 'room_type',
    section: 'profil',
    labelKey: 'leads.roomPreference',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'interested_hotel',
    section: 'profil',
    labelKey: 'filters.interestedHotel',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
];

const detayFields: FilterFieldDef[] = [
  {
    id: 'loss_reason',
    section: 'detay',
    labelKey: 'filters.lossReason',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'loss',
    options: LOSS_REASONS,
  },
  {
    id: 'created_at',
    section: 'detay',
    labelKey: 'leads.created',
    table: 'leads',
    kind: 'date',
    supportsDatetime: true,
  },
  {
    id: 'assigned_to',
    section: 'detay',
    labelKey: 'leads.assignee',
    table: 'leads',
    kind: 'assignee',
    managerOnly: true,
  },
  {
    id: 'message_from',
    section: 'detay',
    labelKey: 'filters.channel',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'channel',
    options: MESSAGE_FROM_VALUES,
  },
  {
    id: 'move_in',
    section: 'detay',
    labelKey: 'leads.moveIn',
    table: 'lead_details',
    kind: 'date',
  },
];

const sistemFields: FilterFieldDef[] = [
  {
    id: 'sla_status',
    section: 'sistem',
    labelKey: 'filters.sla',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'sla',
    options: ['on_time', 'breached'],
  },
  {
    id: 'lead_source',
    section: 'sistem',
    labelKey: 'filters.source',
    table: 'leads',
    kind: 'enum',
    enumGroup: 'source',
    options: LEAD_SOURCES,
  },
  {
    id: 'is_organic',
    section: 'sistem',
    labelKey: 'filters.organic',
    table: 'leads',
    kind: 'boolean',
  },
  {
    id: 'lead_score',
    section: 'sistem',
    labelKey: 'filters.minScore',
    table: 'leads',
    kind: 'number',
  },
  {
    id: 'nationality',
    section: 'sistem',
    labelKey: 'filters.nationality',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'preferred_district',
    section: 'sistem',
    labelKey: 'filters.preferredDistrict',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'campus',
    section: 'sistem',
    labelKey: 'filters.campus',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'room_category',
    section: 'sistem',
    labelKey: 'filters.roomCategory',
    table: 'lead_details',
    kind: 'enum',
    enumGroup: 'room',
    options: ROOM_CATEGORY_VALUES,
  },
  {
    id: 'district_preference',
    section: 'sistem',
    labelKey: 'filters.districtPreference',
    table: 'lead_details',
    kind: 'text',
    supportsFuzzy: true,
  },
  {
    id: 'rec_hotel',
    section: 'sistem',
    labelKey: 'filters.hasHotelRec',
    table: 'lead_details',
    kind: 'boolean',
  },
  {
    id: 'has_moved_in',
    section: 'sistem',
    labelKey: 'filters.hasMovedIn',
    table: 'leads',
    kind: 'boolean',
  },
  {
    id: 'is_24h_restricted',
    section: 'sistem',
    labelKey: 'filters.is24hRestricted',
    table: 'leads',
    kind: 'boolean',
  },
  {
    id: 'move_in_date_set',
    section: 'sistem',
    labelKey: 'filters.moveInDateSet',
    table: 'leads',
    kind: 'boolean',
  },
];

/** All active-lead filter field definitions. */
export const LEAD_FILTER_FIELD_REGISTRY: FilterFieldDef[] = [
  ...genelFields,
  ...profilFields,
  ...detayFields,
  ...sistemFields,
];

/** Registry entries grouped by panel section. */
export function filterFieldsBySection(
  section: FilterSection,
  registry: FilterFieldDef[] = LEAD_FILTER_FIELD_REGISTRY,
): FilterFieldDef[] {
  return registry.filter((f) => f.section === section);
}

/** Lookup a field definition by column id. */
export function getFilterFieldDef(id: string): FilterFieldDef | undefined {
  return LEAD_FILTER_FIELD_REGISTRY.find((f) => f.id === id);
}

/** Old leads: fields that exist on old_leads / old_lead_details and are filterable via the API. */
const OLD_LEAD_ONLY_FIELDS: FilterFieldDef[] = [
  {
    id: 'budget_min',
    section: 'profil',
    labelKey: 'filters.budgetMin',
    table: 'lead_details',
    kind: 'number',
  },
  {
    id: 'budget_max',
    section: 'profil',
    labelKey: 'filters.budgetMax',
    table: 'lead_details',
    kind: 'number',
  },
  {
    id: 'kvkk_opt_in',
    section: 'detay',
    labelKey: 'filters.kvkkOptIn',
    table: 'lead_details',
    kind: 'boolean',
  },
  {
    id: 'marketing_opt_in',
    section: 'detay',
    labelKey: 'filters.marketingOptIn',
    table: 'lead_details',
    kind: 'boolean',
  },
];

/** Active-lead fields not applicable to old_leads schema or API. */
const OLD_LEAD_EXCLUDED_FIELD_IDS = new Set([
  'deal_awaiting',
  'notes',
  'budget_tier',
  'school_shortname',
  'sla_status',
  'campus',
  'room_category',
  'district_preference',
  'has_moved_in',
  'is_24h_restricted',
  'move_in_date_set',
]);

function buildOldLeadFilterRegistry(): FilterFieldDef[] {
  const allowed = new Set<string>(OLD_LEAD_LIST_FILTER_FIELDS as readonly string[]);
  const fromLead = LEAD_FILTER_FIELD_REGISTRY.filter(
    (f) => allowed.has(f.id) && !OLD_LEAD_EXCLUDED_FIELD_IDS.has(f.id),
  );
  const fromOldOnly = OLD_LEAD_ONLY_FIELDS.filter((f) => allowed.has(f.id));
  const seen = new Set<string>();
  return [...fromLead, ...fromOldOnly].filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
}

export const OLD_LEAD_FILTER_FIELD_REGISTRY: FilterFieldDef[] = buildOldLeadFilterRegistry();
