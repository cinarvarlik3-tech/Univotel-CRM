/**
 * Per-salesperson analytics payload — all five sections (Global, Visits, Deals, Loss & Risk, Speed).
 * Called by GET /api/analytics/salesperson (manager/superadmin only).
 *
 * Credit rules (event-level / held-at-step):
 *   - Messages    → lead_messages.sender_agent_id  (direction = outgoing)
 *   - Calls       → contact_history, interaction_type IN call-type-set
 *   - Visits      → visits.created_by
 *   - Stage moves → lead_stage_history.changed_by
 *   - Revenue     → sozlesme-imzalandi transition changed_by
 *   - Loss        → lead_stage_history.changed_by into 'lost'
 *   - Intake owner → changed_by of lead's FIRST lead_stage_history row
 *
 * Call type-set: 'call' | 'whatsapp_call' | 'call_success' | 'call_fail'
 */
import { createServiceClient } from '@/lib/supabase/service';
import {
  bucketByIstanbulDay,
  enumerateIstanbulDays,
  istanbulDayKey,
} from '@/lib/analytics/trend-buckets';
import {
  fetchAllRows,
  CALL_TYPES,
  computeMedianTimeInStage,
} from '@/lib/analytics/overview-shared';
import { median } from '@/lib/analytics/overview-format';
import type { OverviewDateRange } from '@/lib/analytics/overview-range';
import type { OverviewLineSeries, OverviewStageBar } from '@/lib/analytics/overview-shared';

// ── Public types ─────────────────────────────────────────────────────────────

export interface DualAxisSeries {
  days: string[];
  counts: number[];
  rates: (number | null)[];
  maturingIndices: number[];
}

export interface ComparativePieSlice {
  id: string;
  repCount: number;
  teamCount: number;
}

export interface BenchmarkValues {
  contractedRevenue: number;
  leadCount: number;
  conversionRate: number | null;
  activeRepCount: number;
}

export interface SalespersonRepInfo {
  id: string;
  fullName: string;
  isActive: boolean;
  activeLeadCount: number;
  maxActiveLeads: number;
  shiftStart: string;
  shiftEnd: string;
  tenureDays: number;
  sourceMix: { source: string; count: number }[];
}

export interface SalespersonGlobalSection {
  contractedRevenue: number;
  leadCount: number;
  messageCount: number;
  conversionRate: number | null;
  responseTimeMedianMinutes: number | null;
  responseTimeP90Minutes: number | null;
  teamBenchmarks: BenchmarkValues;
  revenueOverTime: OverviewLineSeries;
  leadCountOverTime: OverviewLineSeries;
  messageCountOverTime: OverviewLineSeries;
  conversionOverTime: DualAxisSeries;
}

export interface SalespersonVisitsSection {
  visitCount: number;
  visitShowRate: number | null;
  conversionToVisit: number | null;
  conversionFromVisit: number | null;
  visitCountOverTime: OverviewLineSeries;
  visitShowRateOverTime: OverviewLineSeries;
  visitConversionsToVisitOverTime: DualAxisSeries;
  visitConversionsFromVisitOverTime: DualAxisSeries;
}

export interface SalespersonDealsSection {
  saleCount: number;
  avgDiscountPct: number | null;
  biggestDiscountPct: number | null;
  biggestDiscountTry: number | null;
  biggestDiscountLeadId: string | null;
  biggestDealRevenue: number | null;
  biggestDealLeadId: string | null;
  pctDealsWithDiscount: number | null;
  salesOverTime: OverviewLineSeries;
  discountOverTime: OverviewLineSeries;
}

export interface SalespersonLossRiskSection {
  lossCount: number;
  restrictedCount: number;
  lossReasonDist: ComparativePieSlice[];
  lossStageDist: ComparativePieSlice[];
  restrictedOverTime: OverviewLineSeries;
  lossCountOverTime: OverviewLineSeries;
}

export interface SalespersonSpeedSection {
  latenessRate: number | null;
  touchPerLead: number | null;
  avgCycleDays: number | null;
  openPipelineMedianAgeDays: number | null;
  timeInStage: OverviewStageBar[];
  touchPerLeadOverTime: OverviewLineSeries;
  cycleLengthOverTime: OverviewLineSeries;
}

export interface SalespersonAnalyticsPayload {
  rep: SalespersonRepInfo;
  global: SalespersonGlobalSection;
  visits: SalespersonVisitsSection;
  deals: SalespersonDealsSection;
  lossRisk: SalespersonLossRiskSection;
  speed: SalespersonSpeedSection;
}

// ── Internal row types ───────────────────────────────────────────────────────

interface StageRow {
  lead_uuid: string;
  changed_by: string | null;
  to_status: string;
  from_status: string | null;
  changed_at: string;
}

interface LeadRow {
  uuid: string;
  created_at: string;
  lead_source: string;
  assigned_to: string | null;
  claimed_at: string | null;
  funnel_status_before_lost: string | null;
  loss_reason: string | null;
}

interface ContactRow {
  lead_uuid: string;
  interaction_type: string;
  created_at: string;
}

interface VisitRow {
  lead_uuid: string | null;
  created_by: string | null;
  status: string;
  scheduled_date: string;
}

interface MessageRow {
  lead_uuid: string;
  created_at: string;
}

interface FinanceRow {
  lead_id: string | null;
  monthly_payment: number | null;
  deal_duration: number | null;
  discount: number | null;
  lead_revenue: number | null;
}

interface TaskRow {
  id: string;
  is_completed: boolean;
  completed_at: string | null;
  due_when: string;
}

interface OpenLeadRow {
  uuid: string;
  created_at: string;
  claimed_at: string | null;
}

interface SalespersonRow {
  id: string;
  full_name: string;
  is_active: boolean;
  active_lead_count: number;
  max_active_leads: number;
  shift_start: string;
  shift_end: string;
  created_at: string;
  role: string;
  chatwoot_user_id: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.min(idx, sorted.length - 1)] ?? null;
}

function emptyLineSeries(days: string[]): OverviewLineSeries {
  return { days, values: new Array<number>(days.length).fill(0) };
}

/**
 * Marks trailing N buckets as maturing (where the window is recent enough that
 * cohort outcomes haven't fully resolved). Uses a 30-day maturation window.
 */
function maturingIndices(days: string[]): number[] {
  const MATURATION_DAYS = 30;
  const now = new Date();
  const indices: number[] = [];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (!day) continue;
    const bucketDate = new Date(`${day}T00:00:00+03:00`);
    const ageDays = (now.getTime() - bucketDate.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays < MATURATION_DAYS) indices.push(i);
  }
  return indices;
}

async function fetchFinanceForLeads(
  client: ReturnType<typeof createServiceClient>,
  leadIds: string[],
): Promise<FinanceRow[]> {
  if (leadIds.length === 0) return [];
  const BATCH = 200;
  const rows: FinanceRow[] = [];
  for (let i = 0; i < leadIds.length; i += BATCH) {
    const batch = leadIds.slice(i, i + BATCH);
    const batchRows = await fetchAllRows<FinanceRow>((a, b) =>
      client
        .from('active_finance')
        .select('lead_id, monthly_payment, deal_duration, discount, lead_revenue')
        .in('lead_id', batch)
        .range(a, b),
    );
    rows.push(...batchRows);
  }
  return rows;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds the full per-rep analytics payload.
 * @param repId - Salesperson UUID.
 * @param range - Resolved date bounds.
 * @param includeKapora - When true, kapora-alindi deals contribute to revenue.
 */
export async function getSalespersonPayload(
  repId: string,
  range: OverviewDateRange,
  _includeKapora: boolean,
): Promise<SalespersonAnalyticsPayload> {
  void _includeKapora; // kapora filter not yet implemented — param kept for API compatibility
  const client = createServiceClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();
  const days = enumerateIstanbulDays(range.from, range.to);
  const now = new Date();

  // ── Phase 1: parallel fetches ─────────────────────────────────────────────
  // Resolve the rep's Chatwoot agent id first — lead_messages.sender_agent_id stores
  // the Chatwoot user id (string), not the salespeople uuid, so messages must be scoped
  // by chatwoot_user_id (mirrors lib/my-day/performance.ts).
  const repRes = await client.from('salespeople').select('*').eq('id', repId).single();
  const repChatwootAgentId =
    (repRes.data as SalespersonRow | null)?.chatwoot_user_id != null
      ? String((repRes.data as SalespersonRow).chatwoot_user_id)
      : null;

  const [
    allSalespeople,
    allLeadsInWindow,
    allStageInWindow,
    repContacts,
    repVisits,
    repMessages,
    repTasks,
    repOpenLeads,
    repRestrictedLeads,
  ] = await Promise.all([
    fetchAllRows<SalespersonRow>((a, b) =>
      client
        .from('salespeople')
        .select(
          'id, full_name, is_active, active_lead_count, max_active_leads, shift_start, shift_end, created_at, role, chatwoot_user_id',
        )
        .in('role', ['salesperson', 'manager', 'superadmin', 'operator'])
        .eq('is_active', true)
        .range(a, b),
    ),

    fetchAllRows<LeadRow>((a, b) =>
      client
        .from('leads')
        .select(
          'uuid, created_at, lead_source, assigned_to, claimed_at, funnel_status_before_lost, loss_reason',
        )
        .eq('is_deleted', false)
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .range(a, b),
    ),

    fetchAllRows<StageRow>((a, b) =>
      client
        .from('lead_stage_history')
        .select('lead_uuid, changed_by, to_status, from_status, changed_at')
        .gte('changed_at', fromIso)
        .lte('changed_at', toIso)
        .range(a, b),
    ),

    fetchAllRows<ContactRow>((a, b) =>
      client
        .from('contact_history')
        .select('lead_uuid, interaction_type, created_at')
        .eq('salesperson_id', repId)
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .range(a, b),
    ),

    fetchAllRows<VisitRow>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('visits')
        .select('lead_uuid, created_by, status, scheduled_date')
        .eq('created_by', repId)
        .gte('scheduled_date', fromIso)
        .lte('scheduled_date', toIso)
        .range(a, b),
    ),

    fetchAllRows<MessageRow>((a, b) =>
      client
        .from('lead_messages')
        .select('lead_uuid, created_at')
        .eq('sender_agent_id', repChatwootAgentId ?? '__no_agent__')
        .eq('direction', 'outgoing')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .range(a, b),
    ),

    fetchAllRows<TaskRow>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('tasks')
        .select('id, is_completed, completed_at, due_when')
        .eq('assigned_to', repId)
        .eq('is_cancelled', false)
        .gte('due_when', fromIso)
        .lte('due_when', toIso)
        .range(a, b),
    ),

    fetchAllRows<OpenLeadRow>((a, b) =>
      client
        .from('leads')
        .select('uuid, created_at, claimed_at')
        .eq('assigned_to', repId)
        .eq('is_deleted', false)
        .not('funnel_status', 'in', '(lost,sozlesme-imzalandi)')
        .range(a, b),
    ),

    fetchAllRows<{ uuid: string }>((a, b) =>
      client
        .from('leads')
        .select('uuid')
        .eq('assigned_to', repId)
        .eq('is_24h_restricted', true)
        .eq('is_deleted', false)
        .range(a, b),
    ),
  ]);

  const rep = repRes.data as SalespersonRow | null;
  if (!rep) throw new Error(`Salesperson ${repId} not found`);

  // ── Phase 2: derive signed lead IDs → fetch finance ──────────────────────
  const repSignedLeadUuids = [
    ...new Set(
      allStageInWindow
        .filter((s) => s.to_status === 'sozlesme-imzalandi' && s.changed_by === repId)
        .map((s) => s.lead_uuid),
    ),
  ];
  const allSignedLeadUuids = [
    ...new Set(
      allStageInWindow.filter((s) => s.to_status === 'sozlesme-imzalandi').map((s) => s.lead_uuid),
    ),
  ];

  const [repFinance, teamFinance] = await Promise.all([
    fetchFinanceForLeads(client, repSignedLeadUuids),
    fetchFinanceForLeads(client, allSignedLeadUuids),
  ]);

  // ── Derive first-stage owner per lead in window ───────────────────────────
  // Groups stage rows by lead; finds the earliest row's changed_by.
  const firstOwnerByLead = new Map<string, string | null>();
  // stageRowsByLead: group all rows in window by lead_uuid
  const stagesByLead = new Map<string, StageRow[]>();
  for (const s of allStageInWindow) {
    const list = stagesByLead.get(s.lead_uuid) ?? [];
    list.push(s);
    stagesByLead.set(s.lead_uuid, list);
  }
  for (const [leadUuid, rows] of stagesByLead) {
    rows.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    firstOwnerByLead.set(leadUuid, rows[0]?.changed_by ?? null);
  }

  // ── Intake leads for rep (held-at-step denominator) ─────────────────────
  const repIntakeLeadUuids = new Set(
    allLeadsInWindow
      .filter((l) => {
        const owner = firstOwnerByLead.get(l.uuid);
        // Fall back to assigned_to when first stage row credits a system actor (no UUID match in salespeople)
        return owner === repId || (owner == null && l.assigned_to === repId);
      })
      .map((l) => l.uuid),
  );
  const repLeadCount = repIntakeLeadUuids.size;

  // Team intake counts (for benchmarks)
  const teamLeadCount = allLeadsInWindow.length;
  const teamSignedCount = allSignedLeadUuids.length;
  const teamConversionRate = teamLeadCount > 0 ? teamSignedCount / teamLeadCount : null;
  const teamContractedRevenue = teamFinance.reduce(
    (sum, f) => sum + (f.lead_revenue ?? (f.monthly_payment ?? 0) * (f.deal_duration ?? 0)),
    0,
  );
  const activeRepCount = allSalespeople.length;

  // ── §1 GLOBAL ──────────────────────────────────────────────────────────────

  // Contracted revenue
  const contractedRevenue = repFinance.reduce(
    (sum, f) => sum + (f.lead_revenue ?? (f.monthly_payment ?? 0) * (f.deal_duration ?? 0)),
    0,
  );

  // Message count + over-time
  const messageCount = repMessages.length;
  const messageCountOverTime: OverviewLineSeries = {
    days,
    values: bucketByIstanbulDay(
      repMessages.map((m) => m.created_at),
      days,
    ),
  };

  // Conversion rate
  const repSignedCount = repSignedLeadUuids.length;
  const conversionRate = repLeadCount > 0 ? repSignedCount / repLeadCount : null;

  // Response time (median + p90): first contact by rep per intake lead
  // Use contact_history entries by rep, find earliest per lead, compare to lead.created_at
  const firstContactByLead = new Map<string, number>(); // lead_uuid → ms from creation
  const leadCreatedAtMap = new Map(allLeadsInWindow.map((l) => [l.uuid, l.created_at]));
  for (const c of repContacts) {
    if (!repIntakeLeadUuids.has(c.lead_uuid)) continue;
    const leadCreated = leadCreatedAtMap.get(c.lead_uuid);
    if (!leadCreated) continue;
    const delta = new Date(c.created_at).getTime() - new Date(leadCreated).getTime();
    if (delta < 0) continue;
    const existing = firstContactByLead.get(c.lead_uuid);
    if (existing === undefined || delta < existing) {
      firstContactByLead.set(c.lead_uuid, delta);
    }
  }
  const responseTimes = [...firstContactByLead.values()]
    .map((ms) => ms / 60000)
    .sort((a, b) => a - b);
  const responseTimeMedianMinutes = median(responseTimes);
  const responseTimeP90Minutes = percentile(responseTimes, 0.9);

  // Revenue over time (by signing date)
  const signedEvents = allStageInWindow.filter(
    (s) => s.to_status === 'sozlesme-imzalandi' && s.changed_by === repId,
  );
  const financeByLead = new Map(repFinance.map((f) => [f.lead_id, f]));
  // Build revenue-per-day bucket
  const revenueBuckets = new Map<string, number>();
  for (const s of signedEvents) {
    const f = financeByLead.get(s.lead_uuid);
    if (!f) continue;
    const day = istanbulDayKey(new Date(s.changed_at));
    revenueBuckets.set(
      day,
      (revenueBuckets.get(day) ?? 0) +
        (f.lead_revenue ?? (f.monthly_payment ?? 0) * (f.deal_duration ?? 0)),
    );
  }
  const revenueOverTime: OverviewLineSeries = {
    days,
    values: days.map((d) => revenueBuckets.get(d) ?? 0),
  };

  // Lead count over time (by lead created_at)
  const repIntakeLeads = allLeadsInWindow.filter((l) => repIntakeLeadUuids.has(l.uuid));
  const leadCountOverTime: OverviewLineSeries = {
    days,
    values: bucketByIstanbulDay(
      repIntakeLeads.map((l) => l.created_at),
      days,
    ),
  };

  // Conversion over time: per day — how many leads created that day got signed within window
  const signedInWindowSet = new Set(repSignedLeadUuids);
  const convCountByDay = new Array<number>(days.length).fill(0);
  const intakeCountByDay = new Array<number>(days.length).fill(0);
  const dayIndex = new Map(days.map((d, i) => [d, i]));
  for (const lead of repIntakeLeads) {
    const i = dayIndex.get(istanbulDayKey(new Date(lead.created_at)));
    if (i === undefined) continue;
    intakeCountByDay[i] += 1;
    if (signedInWindowSet.has(lead.uuid)) convCountByDay[i] += 1;
  }
  const conversionOverTime: DualAxisSeries = {
    days,
    counts: convCountByDay,
    rates: intakeCountByDay.map((cnt, i) =>
      cnt > 0 ? Math.round(((convCountByDay[i] ?? 0) / cnt) * 1000) / 10 : null,
    ),
    maturingIndices: maturingIndices(days),
  };

  const global: SalespersonGlobalSection = {
    contractedRevenue,
    leadCount: repLeadCount,
    messageCount,
    conversionRate: conversionRate !== null ? Math.round(conversionRate * 1000) / 10 : null,
    responseTimeMedianMinutes:
      responseTimeMedianMinutes !== null ? Math.round(responseTimeMedianMinutes) : null,
    responseTimeP90Minutes:
      responseTimeP90Minutes !== null ? Math.round(responseTimeP90Minutes) : null,
    teamBenchmarks: {
      contractedRevenue: teamContractedRevenue,
      leadCount: teamLeadCount,
      conversionRate:
        teamConversionRate !== null ? Math.round(teamConversionRate * 1000) / 10 : null,
      activeRepCount,
    },
    revenueOverTime,
    leadCountOverTime,
    messageCountOverTime,
    conversionOverTime,
  };

  // ── §2 VISITS ─────────────────────────────────────────────────────────────

  const visitedLeadUuids = new Set(repVisits.map((v) => v.lead_uuid).filter(Boolean) as string[]);
  const attendedVisits = repVisits.filter((v) => v.status === 'attended');
  const failedVisits = repVisits.filter((v) => v.status === 'failed');
  const resolvedVisits = attendedVisits.length + failedVisits.length;
  const visitShowRate =
    resolvedVisits > 0 ? Math.round((attendedVisits.length / resolvedVisits) * 1000) / 10 : null;

  // Conversion to visit: distinct leads rep visited ÷ rep's intake lead count
  const distinctVisitedIntakeLeads = [...visitedLeadUuids].filter((id) =>
    repIntakeLeadUuids.has(id),
  ).length;
  const conversionToVisit =
    repLeadCount > 0 ? Math.round((distinctVisitedIntakeLeads / repLeadCount) * 1000) / 10 : null;

  // Conversion from visit: visited leads that reached kapora ÷ rep's visit count
  const kaporaLeadUuidsInWindow = new Set(
    allStageInWindow.filter((s) => s.to_status === 'kapora-alindi').map((s) => s.lead_uuid),
  );
  const visitedLeadsWithKapora = [...visitedLeadUuids].filter((id) =>
    kaporaLeadUuidsInWindow.has(id),
  ).length;
  const conversionFromVisit =
    repVisits.length > 0
      ? Math.round((visitedLeadsWithKapora / repVisits.length) * 1000) / 10
      : null;

  // Visits over time
  const visitCountOverTime: OverviewLineSeries = {
    days,
    values: bucketByIstanbulDay(
      repVisits.map((v) => v.scheduled_date),
      days,
    ),
  };

  // Show rate over time: per day, attended ÷ resolved
  const attendedByDay = bucketByIstanbulDay(
    attendedVisits.map((v) => v.scheduled_date),
    days,
  );
  const resolvedByDay = bucketByIstanbulDay(
    [...attendedVisits, ...failedVisits].map((v) => v.scheduled_date),
    days,
  );
  const visitShowRateOverTime: OverviewLineSeries = {
    days,
    values: resolvedByDay.map((cnt, i) =>
      cnt > 0 ? Math.round(((attendedByDay[i] ?? 0) / cnt) * 1000) / 10 : 0,
    ),
  };

  // Visit conversions over time (to-visit)
  const visitedByDay = bucketByIstanbulDay(
    repVisits.map((v) => v.scheduled_date),
    days,
  );
  const visitConversionsToVisitOverTime: DualAxisSeries = {
    days,
    counts: visitedByDay,
    rates: leadCountOverTime.values.map((intakeCnt, i) =>
      intakeCnt > 0 ? Math.round(((visitedByDay[i] ?? 0) / intakeCnt) * 1000) / 10 : null,
    ),
    maturingIndices: maturingIndices(days),
  };

  // Visit conversions over time (from-visit)
  const kaporaByDay = bucketByIstanbulDay(
    allStageInWindow
      .filter((s) => s.to_status === 'kapora-alindi' && visitedLeadUuids.has(s.lead_uuid))
      .map((s) => s.changed_at),
    days,
  );
  const visitConversionsFromVisitOverTime: DualAxisSeries = {
    days,
    counts: kaporaByDay,
    rates: visitedByDay.map((visCnt, i) =>
      visCnt > 0 ? Math.round(((kaporaByDay[i] ?? 0) / visCnt) * 1000) / 10 : null,
    ),
    maturingIndices: maturingIndices(days),
  };

  const visits: SalespersonVisitsSection = {
    visitCount: repVisits.length,
    visitShowRate,
    conversionToVisit,
    conversionFromVisit,
    visitCountOverTime,
    visitShowRateOverTime,
    visitConversionsToVisitOverTime,
    visitConversionsFromVisitOverTime,
  };

  // ── §3 DEALS ──────────────────────────────────────────────────────────────

  let totalDiscountPct = 0;
  let dealsWithDiscount = 0;
  let biggestDiscountPct: number | null = null;
  let biggestDiscountTry: number | null = null;
  let biggestDiscountLeadId: string | null = null;
  let biggestDealRevenue: number | null = null;
  let biggestDealLeadId: string | null = null;

  for (const f of repFinance) {
    const revenue = f.lead_revenue ?? (f.monthly_payment ?? 0) * (f.deal_duration ?? 0);
    const mp = f.monthly_payment ?? 0;
    const discountPct = mp > 0 ? ((f.discount ?? 0) / mp) * 100 : 0;
    totalDiscountPct += discountPct;

    if ((f.discount ?? 0) > 0) {
      dealsWithDiscount++;
      if (biggestDiscountPct === null || discountPct > biggestDiscountPct) {
        biggestDiscountPct = discountPct;
        biggestDiscountTry = f.discount ?? 0;
        biggestDiscountLeadId = f.lead_id;
      }
    }

    if (biggestDealRevenue === null || revenue > biggestDealRevenue) {
      biggestDealRevenue = revenue;
      biggestDealLeadId = f.lead_id;
    }
  }

  const avgDiscountPct =
    repFinance.length > 0 ? Math.round((totalDiscountPct / repFinance.length) * 10) / 10 : null;
  const pctDealsWithDiscount =
    repFinance.length > 0 ? Math.round((dealsWithDiscount / repFinance.length) * 1000) / 10 : null;

  // Sales over time
  const salesOverTime: OverviewLineSeries = {
    days,
    values: bucketByIstanbulDay(
      signedEvents.map((s) => s.changed_at),
      days,
    ),
  };

  // Avg discount over time (per-day average)
  const discountSumByDay = new Array<number>(days.length).fill(0);
  const discountCntByDay = new Array<number>(days.length).fill(0);
  for (const s of signedEvents) {
    const f = financeByLead.get(s.lead_uuid);
    if (!f) continue;
    const i = dayIndex.get(istanbulDayKey(new Date(s.changed_at)));
    if (i === undefined) continue;
    const mp2 = f.monthly_payment ?? 0;
    const pct = mp2 > 0 ? ((f.discount ?? 0) / mp2) * 100 : 0;
    discountSumByDay[i] += pct;
    discountCntByDay[i] += 1;
  }
  const discountOverTime: OverviewLineSeries = {
    days,
    values: discountCntByDay.map((cnt, i) =>
      cnt > 0 ? Math.round(((discountSumByDay[i] ?? 0) / cnt) * 10) / 10 : 0,
    ),
  };

  const deals: SalespersonDealsSection = {
    saleCount: repSignedCount,
    avgDiscountPct,
    biggestDiscountPct:
      biggestDiscountPct !== null ? Math.round(biggestDiscountPct * 10) / 10 : null,
    biggestDiscountTry,
    biggestDiscountLeadId,
    biggestDealRevenue,
    biggestDealLeadId,
    pctDealsWithDiscount,
    salesOverTime,
    discountOverTime,
  };

  // ── §4 LOSS & RISK ────────────────────────────────────────────────────────

  const repLossEvents = allStageInWindow.filter(
    (s) => s.to_status === 'lost' && s.changed_by === repId,
  );
  const allLossEvents = allStageInWindow.filter((s) => s.to_status === 'lost');

  // Loss reason distribution (rep vs team)
  const repLossReasonCounts = new Map<string, number>();
  const teamLossReasonCounts = new Map<string, number>();
  for (const s of repLossEvents) {
    const lead = allLeadsInWindow.find((l) => l.uuid === s.lead_uuid);
    const reason = lead?.loss_reason ?? 'unknown';
    repLossReasonCounts.set(reason, (repLossReasonCounts.get(reason) ?? 0) + 1);
  }
  for (const s of allLossEvents) {
    const lead = allLeadsInWindow.find((l) => l.uuid === s.lead_uuid);
    const reason = lead?.loss_reason ?? 'unknown';
    teamLossReasonCounts.set(reason, (teamLossReasonCounts.get(reason) ?? 0) + 1);
  }
  const allReasons = new Set([...repLossReasonCounts.keys(), ...teamLossReasonCounts.keys()]);
  const lossReasonDist: ComparativePieSlice[] = [...allReasons]
    .map((id) => ({
      id,
      repCount: repLossReasonCounts.get(id) ?? 0,
      teamCount: teamLossReasonCounts.get(id) ?? 0,
    }))
    .sort((a, b) => b.repCount - a.repCount);

  // Loss stage distribution
  const repLossStageCounts = new Map<string, number>();
  const teamLossStageCounts = new Map<string, number>();
  for (const s of repLossEvents) {
    const lead = allLeadsInWindow.find((l) => l.uuid === s.lead_uuid);
    const stage = lead?.funnel_status_before_lost ?? 'unknown';
    repLossStageCounts.set(stage, (repLossStageCounts.get(stage) ?? 0) + 1);
  }
  for (const s of allLossEvents) {
    const lead = allLeadsInWindow.find((l) => l.uuid === s.lead_uuid);
    const stage = lead?.funnel_status_before_lost ?? 'unknown';
    teamLossStageCounts.set(stage, (teamLossStageCounts.get(stage) ?? 0) + 1);
  }
  const allStages = new Set([...repLossStageCounts.keys(), ...teamLossStageCounts.keys()]);
  const lossStageDist: ComparativePieSlice[] = [...allStages]
    .map((id) => ({
      id,
      repCount: repLossStageCounts.get(id) ?? 0,
      teamCount: teamLossStageCounts.get(id) ?? 0,
    }))
    .sort((a, b) => b.repCount - a.repCount);

  // Restricted leads over time — snapshot, so we show current count as a flat line
  // (restricted_at timestamp not stored; use a constant for the last day)
  const restrictedCount = repRestrictedLeads.length;
  const restrictedOverTime: OverviewLineSeries = emptyLineSeries(days);
  // Mark today's bucket with the snapshot count
  const todayKey = istanbulDayKey(now);
  const todayIdx = dayIndex.get(todayKey);
  if (todayIdx !== undefined) {
    restrictedOverTime.values[todayIdx] = restrictedCount;
  }

  // Loss count over time
  const lossCountOverTime: OverviewLineSeries = {
    days,
    values: bucketByIstanbulDay(
      repLossEvents.map((s) => s.changed_at),
      days,
    ),
  };

  const lossRisk: SalespersonLossRiskSection = {
    lossCount: repLossEvents.length,
    restrictedCount,
    lossReasonDist,
    lossStageDist,
    restrictedOverTime,
    lossCountOverTime,
  };

  // ── §5 SPEED ──────────────────────────────────────────────────────────────

  // Lateness: tasks that were not completed on time, or are still open past due_when
  const lateOrOverdueTasks = repTasks.filter(
    (t) =>
      (!t.is_completed && new Date(t.due_when).getTime() < now.getTime()) ||
      (t.is_completed &&
        t.completed_at != null &&
        new Date(t.completed_at).getTime() > new Date(t.due_when).getTime()),
  );
  const latenessRate =
    repTasks.length > 0
      ? Math.round((lateOrOverdueTasks.length / repTasks.length) * 1000) / 10
      : null;

  // Touch per lead = (outbound messages + calls) ÷ leads rep owned in window
  const callCount = repContacts.filter((c) => CALL_TYPES.has(c.interaction_type)).length;
  const touchTotal = messageCount + callCount;
  const touchPerLead = repLeadCount > 0 ? Math.round((touchTotal / repLeadCount) * 10) / 10 : null;

  // Avg cycle length (intake → signing for rep's signed deals)
  const cycleDays: number[] = [];
  for (const s of signedEvents) {
    const lead = allLeadsInWindow.find((l) => l.uuid === s.lead_uuid);
    if (!lead) continue;
    const startDate = lead.claimed_at ?? lead.created_at;
    const cycleDuration =
      (new Date(s.changed_at).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000);
    if (cycleDuration >= 0) cycleDays.push(cycleDuration);
  }
  const avgCycleDays =
    cycleDays.length > 0
      ? Math.round((cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) * 10) / 10
      : null;

  // Open pipeline median age (snapshot)
  const openAges = repOpenLeads.map((l) => {
    const start = new Date(l.claimed_at ?? l.created_at).getTime();
    return (now.getTime() - start) / (24 * 60 * 60 * 1000);
  });
  const openPipelineMedianAgeDays =
    openAges.length > 0 ? median([...openAges].sort((a, b) => a - b)) : null;

  // Time in stage (rep's leads — filter stage history to rep's intake leads)
  const repStageHistory = allStageInWindow.filter((s) => repIntakeLeadUuids.has(s.lead_uuid));
  const timeInStage = computeMedianTimeInStage(repStageHistory, range);

  // Touch per lead over time (per day)
  const callsByDay = bucketByIstanbulDay(
    repContacts.filter((c) => CALL_TYPES.has(c.interaction_type)).map((c) => c.created_at),
    days,
  );
  const touchPerLeadOverTime: OverviewLineSeries = {
    days,
    values: leadCountOverTime.values.map((cnt, i) => {
      const touch = (messageCountOverTime.values[i] ?? 0) + (callsByDay[i] ?? 0);
      return cnt > 0 ? Math.round((touch / cnt) * 10) / 10 : 0;
    }),
  };

  // Cycle length over time (per signing day)
  const cycleSumByDay = new Array<number>(days.length).fill(0);
  const cycleCntByDay = new Array<number>(days.length).fill(0);
  for (let k = 0; k < cycleDays.length; k++) {
    const s = signedEvents[k];
    if (!s) continue;
    const i = dayIndex.get(istanbulDayKey(new Date(s.changed_at)));
    if (i === undefined) continue;
    cycleSumByDay[i] += cycleDays[k] ?? 0;
    cycleCntByDay[i] += 1;
  }
  const cycleLengthOverTime: OverviewLineSeries = {
    days,
    values: cycleCntByDay.map((cnt, i) =>
      cnt > 0 ? Math.round(((cycleSumByDay[i] ?? 0) / cnt) * 10) / 10 : 0,
    ),
  };

  const speed: SalespersonSpeedSection = {
    latenessRate,
    touchPerLead,
    avgCycleDays,
    openPipelineMedianAgeDays:
      openPipelineMedianAgeDays !== null ? Math.round(openPipelineMedianAgeDays) : null,
    timeInStage,
    touchPerLeadOverTime,
    cycleLengthOverTime,
  };

  // ── Rep info ───────────────────────────────────────────────────────────────

  const sourceCounts = new Map<string, number>();
  for (const lead of repIntakeLeads) {
    sourceCounts.set(lead.lead_source, (sourceCounts.get(lead.lead_source) ?? 0) + 1);
  }
  const sourceMix = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const tenureDays = Math.round(
    (now.getTime() - new Date(rep.created_at).getTime()) / (24 * 60 * 60 * 1000),
  );

  const repInfo: SalespersonRepInfo = {
    id: rep.id,
    fullName: rep.full_name,
    isActive: rep.is_active,
    activeLeadCount: rep.active_lead_count,
    maxActiveLeads: rep.max_active_leads,
    shiftStart: rep.shift_start,
    shiftEnd: rep.shift_end,
    tenureDays,
    sourceMix,
  };

  return { rep: repInfo, global, visits, deals, lossRisk, speed };
}
