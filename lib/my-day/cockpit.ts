/**
 * My Day cockpit aggregation — six task containers for the "Bugün" tab.
 * All queries are self-scoped (assigned_to = userId) except Visits (property-scoped).
 * Called by GET /api/my-day/cockpit.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { istanbulTodayBounds } from '@/lib/time/istanbul';
import { isManagerOrAbove } from '@/lib/auth/roles';

// ── Stage groups ──────────────────────────────────────────────────────────────

/** Stages shown in the Nurtures container (Beslenecekler). */
const NURTURE_STAGES = ['arandi', 'bilgi-verildi', 'bizi-aradi-konustuk'] as const;

/** Stages shown in the Calls container (Aranacaklar). */
const CALL_STAGES = ['aranacak', 'arandi-acmadi'] as const;

/** Stages shown in the Post-visit Nurture container (Ziyaret Sonrası Takip). */
const POST_VISIT_STAGES = ['ziyaret-etti', 'teklif-gonderildi'] as const;

// ── Row types ─────────────────────────────────────────────────────────────────

export interface NurtureRow {
  uuid: string;
  name: string | null;
  phone: string | null;
  stage: string;
  channel: string | null;
  lastContactAt: string | null;
  lastContactLabel: string;
  /** Hours until the 24h WhatsApp window closes. Null = not applicable / unavailable. */
  hoursUntil24h: number | null;
}

export interface CallTaskRow {
  uuid: string;
  name: string | null;
  phone: string | null;
  stage: string;
  channel: string | null;
  lastContactAt: string | null;
  lastContactLabel: string;
}

export interface VisitRow {
  id: string;
  leadUuid: string;
  leadName: string | null;
  leadPhone: string | null;
  propertyId: string;
  propertyName: string;
  scheduledDate: string;
  timeLabel: string;
  status: 'scheduled' | 'attended' | 'failed';
  assignedTo: string | null;
}

export interface MoveInRow {
  uuid: string;
  name: string | null;
  phone: string | null;
  propertyName: string | null;
  moveInDate: string;
}

export interface RecentCallRow {
  id: string;
  leadUuid: string;
  leadName: string | null;
  leadPhone: string | null;
  direction: 'inbound' | 'outbound';
  answered: boolean;
  durationSeconds: number;
  calledAt: string;
  timeLabel: string;
  isLogged: boolean;
}

export interface PropertyOption {
  id: string;
  name: string;
}

export interface CockpitPayload {
  user: {
    firstName: string;
    fullName: string;
    isManager: boolean;
    homePropertyId: string | null;
  };
  properties: PropertyOption[];
  nurtures: NurtureRow[];
  calls: CallTaskRow[];
  visits: VisitRow[];
  postVisit: NurtureRow[];
  moveIns: MoveInRow[];
  recentCalls: RecentCallRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns an Istanbul-timezone date string (YYYY-MM-DD). */
function istanbulDateStr(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Formats a timestamp to a short HH:MM label in Istanbul time. */
function toTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Relative time label in Turkish (e.g. "3 gün önce"). */
function relativeLabel(isoOrNull: string | null): string {
  if (!isoOrNull) return 'hiç aranmadı';
  const diffMs = Date.now() - new Date(isoOrNull).getTime();
  if (diffMs < 0) return 'az önce';
  const mins = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (mins < 2) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  if (hrs < 24) return `${hrs} saat önce`;
  if (days === 1) return 'dün';
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} ay önce` : `${Math.floor(days / 365)} yıl önce`;
}

/**
 * Computes hours remaining in the 24h WhatsApp messaging window.
 * Returns null when the timestamp is unavailable.
 * Flags when 0 < hoursLeft ≤ 6 (approaching threshold).
 */
function compute24hHoursLeft(lastInboundAt: string | null): number | null {
  if (!lastInboundAt) return null;
  const inboundMs = new Date(lastInboundAt).getTime();
  const windowCloseMs = inboundMs + 24 * 3_600_000;
  const hoursLeft = (windowCloseMs - Date.now()) / 3_600_000;
  if (hoursLeft <= 0 || hoursLeft > 6) return null;
  return Math.round(hoursLeft * 10) / 10;
}

// ── Main aggregation ──────────────────────────────────────────────────────────

export async function getCockpitPayload(
  userId: string,
  userRole: string,
  userFullName: string,
): Promise<CockpitPayload> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createServiceClient() as any;
  const now = new Date();
  const { start: todayStart, end: todayEnd } = istanbulTodayBounds(now);
  const todayStartIso = todayStart.toISOString();
  const todayEndIso = todayEnd.toISOString();
  const todayDateStr = istanbulDateStr(now);
  const isManager = isManagerOrAbove(userRole);

  // ── 1. User profile (home_property_id) ───────────────────────────────────
  const { data: spProfile } = await client
    .from('salespeople')
    .select('home_property_id')
    .eq('id', userId)
    .maybeSingle();

  const homePropertyId =
    (spProfile as { home_property_id: string | null } | null)?.home_property_id ?? null;

  // ── 2. Properties list (for Visits switcher) ─────────────────────────────
  const { data: propertiesRaw } = await client
    .from('properties')
    .select('id, hotel_name')
    .eq('is_available', true)
    .order('hotel_name', { ascending: true });

  const properties: PropertyOption[] = (
    (propertiesRaw ?? []) as Array<{
      id: string;
      hotel_name: string;
    }>
  ).map((p) => ({ id: p.id, name: p.hotel_name }));

  // ── 3. My active leads (base dataset for containers) ─────────────────────
  const { data: myLeadsRaw } = await client
    .from('leads')
    .select(
      'uuid, lead_name, lead_phone, funnel_status, last_contact_at, last_inbound_message_at, message_from',
    )
    .eq('assigned_to', userId)
    .eq('is_archived', false)
    .eq('is_deleted', false)
    .not('funnel_status', 'in', '("lost","sozlesme-imzalandi")');

  const myLeads = (myLeadsRaw ?? []) as Array<{
    uuid: string;
    lead_name: string | null;
    lead_phone: string | null;
    funnel_status: string;
    last_contact_at: string | null;
    last_inbound_message_at: string | null;
    message_from: string | null;
  }>;

  const myLeadUuids = myLeads.map((l) => l.uuid);

  // ── 4. Leads contacted today ──────────────────────────────────────────────
  let contactedTodayUuids = new Set<string>();
  if (myLeadUuids.length > 0) {
    const { data: contactedRows } = await client
      .from('contact_history')
      .select('lead_uuid')
      .in('lead_uuid', myLeadUuids)
      .gte('created_at', todayStartIso)
      .lte('created_at', todayEndIso);
    contactedTodayUuids = new Set(
      ((contactedRows ?? []) as Array<{ lead_uuid: string }>).map((r) => r.lead_uuid),
    );
  }

  // ── 5. Nurtures (Beslenecekler) ───────────────────────────────────────────
  const nurtureLeads = myLeads.filter(
    (l) =>
      (NURTURE_STAGES as readonly string[]).includes(l.funnel_status) &&
      !contactedTodayUuids.has(l.uuid),
  );

  // Sort: 24h-approaching asc nulls last, then last_contact_at asc nulls first.
  const withHours = nurtureLeads.map((l) => ({
    lead: l,
    hoursLeft: compute24hHoursLeft(l.last_inbound_message_at),
  }));
  withHours.sort((a, b) => {
    if (a.hoursLeft !== null && b.hoursLeft !== null) return a.hoursLeft - b.hoursLeft;
    if (a.hoursLeft !== null) return -1;
    if (b.hoursLeft !== null) return 1;
    const aMs = a.lead.last_contact_at ? new Date(a.lead.last_contact_at).getTime() : 0;
    const bMs = b.lead.last_contact_at ? new Date(b.lead.last_contact_at).getTime() : 0;
    return aMs - bMs;
  });

  const nurtures: NurtureRow[] = withHours.map(({ lead, hoursLeft }) => ({
    uuid: lead.uuid,
    name: lead.lead_name,
    phone: lead.lead_phone,
    stage: lead.funnel_status,
    channel: lead.message_from,
    lastContactAt: lead.last_contact_at,
    lastContactLabel: relativeLabel(lead.last_contact_at),
    hoursUntil24h: hoursLeft,
  }));

  // ── 6. Calls (Aranacaklar) ────────────────────────────────────────────────
  const callLeads = myLeads
    .filter((l) => (CALL_STAGES as readonly string[]).includes(l.funnel_status))
    .sort((a, b) => {
      const aMs = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0;
      const bMs = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0;
      return aMs - bMs;
    });

  const calls: CallTaskRow[] = callLeads.map((l) => ({
    uuid: l.uuid,
    name: l.lead_name,
    phone: l.lead_phone,
    stage: l.funnel_status,
    channel: l.message_from,
    lastContactAt: l.last_contact_at,
    lastContactLabel: relativeLabel(l.last_contact_at),
  }));

  // ── 7. Visits (Bugünkü Ziyaretler) ───────────────────────────────────────
  const { data: visitsRaw } = await client
    .from('visits')
    .select(
      'id, lead_uuid, property_id, scheduled_date, status, leads!inner(lead_name, lead_phone, assigned_to), properties!inner(hotel_name)',
    )
    .gte('scheduled_date', todayStartIso)
    .lte('scheduled_date', todayEndIso)
    .order('scheduled_date', { ascending: true });

  const visits: VisitRow[] = (
    (visitsRaw ?? []) as Array<{
      id: string;
      lead_uuid: string;
      property_id: string;
      scheduled_date: string;
      status: string;
      leads: {
        lead_name: string | null;
        lead_phone: string | null;
        assigned_to: string | null;
      } | null;
      properties: { hotel_name: string } | null;
    }>
  ).map((v) => ({
    id: v.id,
    leadUuid: v.lead_uuid,
    leadName: v.leads?.lead_name ?? null,
    leadPhone: v.leads?.lead_phone ?? null,
    propertyId: v.property_id,
    propertyName: v.properties?.hotel_name ?? 'Bilinmeyen Tesis',
    scheduledDate: v.scheduled_date,
    timeLabel: toTimeLabel(v.scheduled_date),
    status: v.status as 'scheduled' | 'attended' | 'failed',
    assignedTo: v.leads?.assigned_to ?? null,
  }));

  // ── 8. Post-visit nurtures (Ziyaret Sonrası Takip) ───────────────────────
  const postVisitLeads = myLeads.filter(
    (l) =>
      (POST_VISIT_STAGES as readonly string[]).includes(l.funnel_status) &&
      !contactedTodayUuids.has(l.uuid),
  );

  const withHoursPost = postVisitLeads.map((l) => ({
    lead: l,
    hoursLeft: compute24hHoursLeft(l.last_inbound_message_at),
  }));
  withHoursPost.sort((a, b) => {
    if (a.hoursLeft !== null && b.hoursLeft !== null) return a.hoursLeft - b.hoursLeft;
    if (a.hoursLeft !== null) return -1;
    if (b.hoursLeft !== null) return 1;
    const aMs = a.lead.last_contact_at ? new Date(a.lead.last_contact_at).getTime() : 0;
    const bMs = b.lead.last_contact_at ? new Date(b.lead.last_contact_at).getTime() : 0;
    return aMs - bMs;
  });

  const postVisit: NurtureRow[] = withHoursPost.map(({ lead, hoursLeft }) => ({
    uuid: lead.uuid,
    name: lead.lead_name,
    phone: lead.lead_phone,
    stage: lead.funnel_status,
    channel: lead.message_from,
    lastContactAt: lead.last_contact_at,
    lastContactLabel: relativeLabel(lead.last_contact_at),
    hoursUntil24h: hoursLeft,
  }));

  // ── 9. Move-ins (Bugün Taşınanlar) ───────────────────────────────────────
  let moveIns: MoveInRow[] = [];
  if (myLeadUuids.length > 0) {
    const { data: moveInDetailsRaw } = await client
      .from('lead_details')
      .select('lead_uuid, move_in')
      .in('lead_uuid', myLeadUuids)
      .eq('move_in', todayDateStr);

    const moveInLeadUuids = new Set(
      ((moveInDetailsRaw ?? []) as Array<{ lead_uuid: string }>).map((r) => r.lead_uuid),
    );

    const moveInLeads = myLeads
      .filter((l) => moveInLeadUuids.has(l.uuid))
      .sort((a, b) => {
        const na = a.lead_name ?? '';
        const nb = b.lead_name ?? '';
        return na.localeCompare(nb, 'tr');
      });

    // Get property associations for move-in leads via lead_details.interested_hotel or
    // the most recent visit's property. Use recent visit property as proxy.
    if (moveInLeads.length > 0) {
      const moveInUuids = moveInLeads.map((l) => l.uuid);
      const { data: recentVisitsRaw } = await client
        .from('visits')
        .select('lead_uuid, property_id, properties!inner(hotel_name)')
        .in('lead_uuid', moveInUuids)
        .order('scheduled_date', { ascending: false });

      const propertyByLead = new Map<string, string>();
      for (const v of (recentVisitsRaw ?? []) as Array<{
        lead_uuid: string;
        property_id: string;
        properties: { hotel_name: string } | null;
      }>) {
        if (!propertyByLead.has(v.lead_uuid)) {
          propertyByLead.set(v.lead_uuid, v.properties?.hotel_name ?? 'Bilinmeyen Tesis');
        }
      }

      moveIns = moveInLeads.map((l) => ({
        uuid: l.uuid,
        name: l.lead_name,
        phone: l.lead_phone,
        propertyName: propertyByLead.get(l.uuid) ?? null,
        moveInDate: todayDateStr,
      }));
    }
  }

  // ── 10. Son Aramalar (recent CDR calls) ───────────────────────────────────
  const { data: recentCallsRaw } = await client
    .from('contact_history')
    .select(
      'id, lead_uuid, metadata, created_at, salesperson_id, leads!inner(lead_name, lead_phone, assigned_to)',
    )
    .eq('interaction_type', 'call')
    .eq('interaction_source', 'netgsm')
    .eq('leads.assigned_to', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const recentCalls: RecentCallRow[] = (
    (recentCallsRaw ?? []) as Array<{
      id: string;
      lead_uuid: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
      salesperson_id: string | null;
      leads: {
        lead_name: string | null;
        lead_phone: string | null;
        assigned_to: string | null;
      } | null;
    }>
  ).map((row) => {
    const meta = (row.metadata ?? {}) as { direction?: string; duration_seconds?: number };
    const duration = meta.duration_seconds ?? 0;
    return {
      id: row.id,
      leadUuid: row.lead_uuid,
      leadName: row.leads?.lead_name ?? null,
      leadPhone: row.leads?.lead_phone ?? null,
      direction: (meta.direction as 'inbound' | 'outbound') ?? 'outbound',
      answered: duration > 0,
      durationSeconds: duration,
      calledAt: row.created_at,
      timeLabel: toTimeLabel(row.created_at),
      isLogged: Boolean(row.salesperson_id),
    };
  });

  // ── Assemble ──────────────────────────────────────────────────────────────
  const firstName = userFullName.split(' ')[0] ?? userFullName;

  return {
    user: { firstName, fullName: userFullName, isManager, homePropertyId },
    properties,
    nurtures,
    calls,
    visits,
    postVisit,
    moveIns,
    recentCalls,
  };
}
