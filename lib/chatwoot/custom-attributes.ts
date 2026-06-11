/**
 * Chatwoot conversation custom-attribute → CRM field mapping and normalizers.
 *
 * Chatwoot delivers conversation custom-attribute edits in the conversation_updated
 * webhook as a `custom_attributes` entry inside `changed_attributes`, whose
 * current_value/previous_value are full snapshots of the conversation's attributes.
 * We diff the two snapshots and map each changed key to a CRM field.
 */
import { formatInTimeZone } from 'date-fns-tz';
import {
  BUDGET_TIERS,
  CHATWOOT_FUNNEL_LABELS,
  DEFAULT_FUNNEL_STATUS,
  ISTANBUL_TIMEZONE,
  LOST_FUNNEL_STATUS,
  type BudgetTier,
} from '@/lib/constants';
import type { ChatwootConversationUpdated } from '@/types/webhooks';

/** Chatwoot custom-attribute keys the CRM reacts to (canonical key first). */
export const CHATWOOT_CUSTOM_ATTR_KEYS = [
  'university',
  'ilgili_otel',
  'butce',
  'tasinma_tarihi',
  'oda_tiipi',
  'kayip_nedeni',
  'ogrenci_cinsiyet',
] as const;

/** Legacy Chatwoot key — still accepted on inbound webhooks. */
export const CHATWOOT_CUSTOM_ATTR_KEY_OGRENCi_CINSIYETI_LEGACY = 'ogrenci_cinsiyeti';

/** Normalizes a custom-attribute key from webhook payloads. */
export function normalizeCustomAttrKey(key: string): string {
  if (key === CHATWOOT_CUSTOM_ATTR_KEY_OGRENCi_CINSIYETI_LEGACY) {
    return 'ogrenci_cinsiyet';
  }
  return key;
}

/** Chatwoot butce fixed-list display label → budget_tier slug. */
export const BUTCE_LABEL_TO_TIER: Readonly<Record<string, BudgetTier>> = {
  'düşük bütçe': 'dusuk-butce',
  ortalama: 'ortalama',
  'yüksek bütçe': 'yuksek-butce',
  'çok yüksek bütçe': 'cok-yuksek-butce',
  anlaşılmıyor: 'anlasilmiyor',
};

/** budget_tier slug → Chatwoot butce fixed-list display label. */
export const TIER_TO_BUTCE_LABEL: Readonly<Record<BudgetTier, string>> = {
  'dusuk-butce': 'Düşük bütçe',
  ortalama: 'Ortalama',
  'yuksek-butce': 'Yüksek bütçe',
  'cok-yuksek-butce': 'Çok yüksek bütçe',
  anlasilmiyor: 'Anlaşılmıyor',
};

/** Chatwoot oda_tiipi fixed-list label → room_category enum (null = no category / dorm / literal). */
export const ODA_TIPI_TO_ROOM_CATEGORY: Readonly<Record<string, string | null>> = {
  'tek kişilik': 'single',
  'çift kişilik': 'double',
  'üç kişilik': 'triple',
  'dört kişilik': 'quad',
  'fark etmez': null,
  'yurt tipi': null,
};

/** oda_tiipi values stored raw in room_type[] (no room_category). */
export const ODA_TIPI_LITERAL_LABELS = ['Beş Kişilik', '1+1', '2+1', '3+1'] as const;

/** oda_tiipi value that has no room_category equivalent — stored raw in room_type[]. */
export const ODA_TIPI_DORM_LABEL = 'Yurt Tipi';

/** room_category → Chatwoot oda_tiipi fixed-list label. */
export const ROOM_CATEGORY_TO_ODA_TIPI: Readonly<Record<string, string>> = {
  single: 'Tek Kişilik',
  double: 'Çift Kişilik',
  triple: 'Üç Kişilik',
  quad: 'Dört Kişilik',
};

/** Chatwoot kayip_nedeni fixed-list label → loss_reason enum. */
export const KAYIP_NEDENI_TO_LOSS_REASON: Readonly<Record<string, string>> = {
  fiyat: 'price',
  bölge: 'location',
  rakip: 'competitor',
  'yanıt yok': 'no_response',
  'planlar değişti': 'plans_changed',
};

/** loss_reason enum → Chatwoot kayip_nedeni fixed-list label. */
export const LOSS_REASON_TO_KAYIP_NEDENI: Readonly<Record<string, string>> = {
  price: 'fiyat',
  location: 'bölge',
  competitor: 'rakip',
  no_response: 'yanıt yok',
  plans_changed: 'planlar değişti',
};

/** Chatwoot ogrenci_cinsiyet fixed-list label → student_gender enum. */
export const OGRENCI_CINSIYET_TO_STUDENT_GENDER: Readonly<Record<string, string>> = {
  erkek: 'male',
  kız: 'female',
  bilinmiyor: 'other',
};

/** student_gender enum → Chatwoot ogrenci_cinsiyet fixed-list label. */
export const STUDENT_GENDER_TO_OGRENCI_CINSIYET: Readonly<Record<string, string>> = {
  male: 'Erkek',
  female: 'Kız',
  other: 'Bilinmiyor',
};

/** Per-key change: the post-change value and the prior value from the webhook diff. */
export interface CustomAttrChange {
  current: unknown;
  previous: unknown;
}

/** Resolved oda_tiipi inbound mapping. */
export interface OdaTipiInboundResult {
  room_category: string | null;
  room_type: string[];
}

/**
 * Extracts the changed custom attributes from a conversation_updated payload.
 * Diffs current_value vs previous_value of the `custom_attributes` changed entry.
 * @param changedAttributes - Chatwoot changed_attributes array.
 * @returns Map of attribute key → {current, previous} for keys that actually changed, or null.
 */
export function extractCustomAttributeDiff(
  changedAttributes: ChatwootConversationUpdated['changed_attributes'],
): Record<string, CustomAttrChange> | null {
  for (const attr of changedAttributes) {
    if (!('custom_attributes' in attr)) continue;

    const entry = attr.custom_attributes as { current_value?: unknown; previous_value?: unknown };
    const current = isPlainObject(entry.current_value) ? entry.current_value : {};
    const previous = isPlainObject(entry.previous_value) ? entry.previous_value : {};

    const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);
    const diff: Record<string, CustomAttrChange> = {};
    for (const key of keys) {
      const normalizedKey = normalizeCustomAttrKey(key);
      if (!valuesEqual(current[key], previous[key])) {
        diff[normalizedKey] = { current: current[key], previous: previous[key] };
      }
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }
  return null;
}

/** Trims a string-ish value, returning null when empty/absent. */
export function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Maps a Chatwoot butce list label to a budget_tier slug.
 * @param value - Raw Chatwoot butce value.
 */
export function mapButce(value: unknown): BudgetTier | null {
  const text = normalizeText(value);
  if (!text) return null;
  const tier = BUTCE_LABEL_TO_TIER[text.toLocaleLowerCase('tr')];
  if (tier) return tier;
  return null;
}

/**
 * Parses a Chatwoot date attribute into a CRM move_in date (YYYY-MM-DD, Istanbul).
 * Chatwoot sends ISO timestamps at Istanbul-midnight UTC (e.g. 21:00Z), so the
 * naive date part is a day early — convert to Europe/Istanbul before slicing.
 * @param value - Raw Chatwoot tasinma_tarihi value.
 * @returns YYYY-MM-DD string, or null when empty/unparseable.
 */
export function parseMoveInDate(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return formatInTimeZone(date, ISTANBUL_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Formats a CRM move_in date for Chatwoot tasinma_tarihi (Istanbul-midnight UTC).
 * @param moveIn - YYYY-MM-DD string from lead_details.
 */
export function formatMoveInForChatwoot(moveIn: string | null | undefined): string | null {
  if (!moveIn) return null;
  const date = new Date(`${moveIn}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return formatInTimeZone(date, ISTANBUL_TIMEZONE, "yyyy-MM-dd'T'21:00:00.000'Z'");
}

/**
 * Maps a kayip_nedeni value to a loss_reason enum.
 * @param value - Raw Chatwoot kayip_nedeni value.
 * @returns loss_reason slug; 'other' for an unrecognized non-empty value; null when cleared.
 */
export function mapKayipNedeni(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return KAYIP_NEDENI_TO_LOSS_REASON[text.toLocaleLowerCase('tr')] ?? 'other';
}

/**
 * Maps an ogrenci_cinsiyet value to a student_gender enum.
 * @param value - Raw Chatwoot ogrenci_cinsiyet value.
 * @returns student_gender slug, or null when cleared.
 */
export function mapOgrenciCinsiyet(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return OGRENCI_CINSIYET_TO_STUDENT_GENDER[text.toLocaleLowerCase('tr')] ?? null;
}

/**
 * Maps an oda_tiipi value to a room_category enum (or null when no preference/dorm/literal).
 * @param value - Raw Chatwoot oda_tiipi value.
 */
export function mapOdaTipiToRoomCategory(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return ODA_TIPI_TO_ROOM_CATEGORY[text.toLocaleLowerCase('tr')] ?? null;
}

/** True when an oda_tiipi value is the dormitory option stored in room_type[]. */
export function isOdaTipiDorm(value: unknown): boolean {
  return (
    normalizeText(value)?.toLocaleLowerCase('tr') === ODA_TIPI_DORM_LABEL.toLocaleLowerCase('tr')
  );
}

/** True when a room_type entry is a known oda_tiipi literal label. */
export function isOdaTipiLiteralLabel(value: string): boolean {
  const lower = value.toLocaleLowerCase('tr');
  return ODA_TIPI_LITERAL_LABELS.some((label) => label.toLocaleLowerCase('tr') === lower);
}

/**
 * Maps an inbound oda_tiipi Chatwoot value to room_category and room_type updates.
 * @param value - Raw Chatwoot oda_tiipi value.
 * @param prevRoomType - Current room_type array on the lead.
 */
export function mapOdaTipiInbound(
  value: unknown,
  prevRoomType: string[],
): OdaTipiInboundResult | null {
  const text = normalizeText(value);
  if (!text) return null;
  const lower = text.toLocaleLowerCase('tr');
  const dormLower = ODA_TIPI_DORM_LABEL.toLocaleLowerCase('tr');

  if (lower === 'fark etmez') {
    return { room_category: null, room_type: [] };
  }

  const category = ODA_TIPI_TO_ROOM_CATEGORY[lower];
  if (category) {
    const withoutSpecial = prevRoomType.filter(
      (entry) => entry.toLocaleLowerCase('tr') !== dormLower && !isOdaTipiLiteralLabel(entry),
    );
    return { room_category: category, room_type: withoutSpecial };
  }

  if (isOdaTipiDorm(text)) {
    const withoutDorm = prevRoomType.filter((entry) => entry.toLocaleLowerCase('tr') !== dormLower);
    return { room_category: null, room_type: [...withoutDorm, ODA_TIPI_DORM_LABEL] };
  }

  const literal = ODA_TIPI_LITERAL_LABELS.find((label) => label.toLocaleLowerCase('tr') === lower);
  if (literal) {
    return { room_category: null, room_type: [literal] };
  }

  return null;
}

/**
 * Builds the Chatwoot oda_tiipi value from CRM room fields.
 * @param roomCategory - lead_details.room_category.
 * @param roomType - lead_details.room_type array.
 */
export function mapOdaTipiFromCrm(
  roomCategory: string | null | undefined,
  roomType: string[] | null | undefined,
): string | null {
  if (roomCategory && ROOM_CATEGORY_TO_ODA_TIPI[roomCategory]) {
    return ROOM_CATEGORY_TO_ODA_TIPI[roomCategory];
  }

  const types = roomType ?? [];
  const dormLower = ODA_TIPI_DORM_LABEL.toLocaleLowerCase('tr');
  const dorm = types.find((entry) => entry.toLocaleLowerCase('tr') === dormLower);
  if (dorm) return ODA_TIPI_DORM_LABEL;

  const literal = types.find((entry) => isOdaTipiLiteralLabel(entry));
  if (literal) return literal;

  if (types.length === 0 && !roomCategory) return 'Fark Etmez';
  return null;
}

/** Whether a budget_tier slug is valid. */
export function isBudgetTier(value: string): value is BudgetTier {
  return (BUDGET_TIERS as readonly string[]).includes(value);
}

/** Whether a kayip_nedeni change enters lost ('set') or leaves it ('clear'). */
export type LossIntent = 'set' | 'clear' | undefined;

/** Inputs for resolving the funnel_status transition around the 'lost' state. */
export interface LostTransitionInput {
  /** Current funnel_status stored on the lead. */
  prevFunnel: string;
  /** Saved pre-lost stage, if the lead is currently lost. */
  beforeLost: string | null;
  /** Funnel labels added in this webhook (empty when label processing is skipped). */
  added: string[];
  /** Funnel labels removed in this webhook (empty when label processing is skipped). */
  removed: string[];
  /** kayip_nedeni intent from the custom-attribute diff. */
  lossIntent: LossIntent;
}

/** Resolved funnel_status mutations for the 'lost' transition. */
export interface LostTransitionResult {
  /** New funnel_status, when the transition changes it. */
  funnelStatus?: string;
  /** New funnel_status_before_lost value (string to save, null to clear). */
  funnelStatusBeforeLost?: string | null;
  /** True when loss_reason should be cleared (lead is leaving lost). */
  clearLossReason?: boolean;
}

/**
 * Resolves how funnel_status / funnel_status_before_lost change around the lost state.
 *
 * Entering lost (kayip_nedeni set, or the 'lost' label added) saves the prior stage.
 * Leaving lost restores it — but ONLY if the lead is still in 'lost' (an agent who
 * already moved it elsewhere is never overridden). An explicit funnel label honors
 * that stage instead of the saved one.
 * @param input - Current state and this webhook's changes.
 */
export function resolveLostTransition(input: LostTransitionInput): LostTransitionResult {
  const { prevFunnel, beforeLost, added, removed, lossIntent } = input;

  const lostAdded = added.includes(LOST_FUNNEL_STATUS);
  const lostRemoved = removed.includes(LOST_FUNNEL_STATUS);
  const explicitFunnelAdded = added.find(
    (label) => CHATWOOT_FUNNEL_LABELS.has(label) && label !== LOST_FUNNEL_STATUS,
  );

  const enteringLost = lostAdded || lossIntent === 'set';
  if (enteringLost) {
    return {
      funnelStatus: LOST_FUNNEL_STATUS,
      // Save the prior stage only when actually transitioning in (not already lost).
      funnelStatusBeforeLost: prevFunnel !== LOST_FUNNEL_STATUS ? prevFunnel : undefined,
    };
  }

  if (prevFunnel === LOST_FUNNEL_STATUS) {
    if (explicitFunnelAdded) {
      return {
        funnelStatus: explicitFunnelAdded,
        funnelStatusBeforeLost: null,
        clearLossReason: true,
      };
    }
    if (lossIntent === 'clear' || lostRemoved) {
      return {
        funnelStatus: beforeLost ?? DEFAULT_FUNNEL_STATUS,
        funnelStatusBeforeLost: null,
        clearLossReason: true,
      };
    }
  }

  return {};
}

/** Narrows unknown to a plain record. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Shallow value equality for scalar custom-attribute values. */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
