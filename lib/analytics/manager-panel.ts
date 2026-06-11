/**
 * Manager panel aggregation — team-wide salesperson metrics + general trend data.
 * Called by GET /api/analytics/manager-panel (manager/superadmin only).
 *
 * Data sources (all live tables, no materialized views — the panel is range-scoped):
 *   - leads.claimed_at / created_at            → claims and new-lead volume
 *   - contact_history                          → contact activity per salesperson
 *   - visits                                   → visit volume + show rate
 *   - lead_stage_history                       → downpayment / deal-signed credit
 *   - tasks                                    → task completion rate
 *
 * Credit rules mirror lib/my-day/performance.ts:
 *   - Stage transitions credit `changed_by`.
 *   - Visits credit `created_by`.
 *   - Contacts credit `salesperson_id`.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { istanbulTodayBounds, istanbulWeekStart } from '@/lib/time/istanbul';
import { bucketByIstanbulDay, enumerateIstanbulDays } from '@/lib/analytics/trend-buckets';

export type ManagerPanelRange = 'this_week' | 'this_month' | 'last_30_days';

export interface ManagerPanelDateRange {
  from: Date;
  to: Date;
}

/**
 * Resolves a range query param into concrete Istanbul-scoped date bounds.
 * @param rangeParam - 'this_week' | 'this_month' | 'last_30_days' (default this_month).
 * @returns From/to bounds as UTC dates.
 */
export function resolveManagerPanelRange(rangeParam: string | undefined): ManagerPanelDateRange {
  const now = new Date();
  const { end: todayEnd } = istanbulTodayBounds(now);

  if (rangeParam === 'this_week') {
    return { from: istanbulWeekStart(now), to: todayEnd };
  }

  if (rangeParam === 'last_30_days') {
    const { start: todayStart } = istanbulTodayBounds(now);
    return { from: new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000), to: todayEnd };
  }

  // Default: this calendar month (Istanbul).
  const monthStart = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
    }).format(now) + '-01T00:00:00+03:00',
  );
  return { from: monthStart, to: todayEnd };
}

export interface TeamMemberMetrics {
  salespersonId: string;
  fullName: string;
  isActive: boolean;
  activeLeadCount: number;
  claimed: number;
  contactedLeads: number;
  visitsAttended: number;
  visitsFailed: number;
  showRate: number | null;
  downpayments: number;
  dealsSigned: number;
  conversionRate: number | null;
  calls: number;
  messages: number;
  otherContacts: number;
  activityTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
  taskCompletionRate: number | null;
}

export interface ManagerPanelPayload {
  range: { from: string; to: string };
  summary: {
    newLeads: number;
    contacts: number;
    visitsAttended: number;
    dealsSigned: number;
  };
  trends: {
    days: string[];
    newLeads: number[];
    contacts: number[];
    visits: number[];
    dealsSigned: number[];
  };
  team: TeamMemberMetrics[];
}

/** Page size for bulk row fetches (PostgREST default max-rows safe). */
const PAGE_SIZE = 1000;
/** Hard cap on pages per query — protects the Worker from runaway ranges. */
const MAX_PAGES = 10;

/**
 * Fetches all rows of a query in PAGE_SIZE chunks (PostgREST caps single
 * responses), up to MAX_PAGES.
 * @param buildQuery - Factory returning a fresh filtered query per page.
 * @returns Accumulated rows.
 */
async function fetchAllRows<T>(
  buildQuery: (fromIdx: number, toIdx: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const fromIdx = page * PAGE_SIZE;
    const { data } = await buildQuery(fromIdx, fromIdx + PAGE_SIZE - 1);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

interface ClaimRow {
  assigned_to: string | null;
  claimed_at: string | null;
}
interface NewLeadRow {
  created_at: string;
  assigned_to: string | null;
}
interface ContactRow {
  salesperson_id: string | null;
  lead_uuid: string;
  interaction_type: string;
  created_at: string;
}
interface VisitRow {
  created_by: string | null;
  status: string;
  scheduled_date: string;
}
interface StageRow {
  changed_by: string | null;
  to_status: string;
  changed_at: string;
  lead_uuid: string;
}
interface TaskRow {
  assigned_to: string | null;
  is_completed: boolean;
}
interface SalespersonRow {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  active_lead_count: number | null;
}

/**
 * Builds the full manager panel payload for a date range.
 * @param range - Resolved date bounds.
 * @param salespersonId - Optional scope for summary KPIs + trend charts
 *   (team table always covers everyone).
 * @returns Manager panel payload.
 */
export async function getManagerPanelPayload(
  range: ManagerPanelDateRange,
  salespersonId?: string,
): Promise<ManagerPanelPayload> {
  const client = createServiceClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  // ── Bulk fetches (range-scoped, paged) ────────────────────────────────────
  const [salespeopleRes, claims, newLeads, contacts, visits, stageRows, tasks] = await Promise.all([
    client
      .from('salespeople')
      .select('id, full_name, role, is_active, active_lead_count')
      .eq('role', 'salesperson')
      .order('full_name'),
    fetchAllRows<ClaimRow>((a, b) =>
      client
        .from('leads')
        .select('assigned_to, claimed_at')
        .eq('is_deleted', false)
        .gte('claimed_at', fromIso)
        .lte('claimed_at', toIso)
        .range(a, b),
    ),
    fetchAllRows<NewLeadRow>((a, b) =>
      client
        .from('leads')
        .select('created_at, assigned_to')
        .eq('is_deleted', false)
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .range(a, b),
    ),
    fetchAllRows<ContactRow>((a, b) =>
      client
        .from('contact_history')
        .select('salesperson_id, lead_uuid, interaction_type, created_at')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .range(a, b),
    ),
    fetchAllRows<VisitRow>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('visits')
        .select('created_by, status, scheduled_date')
        .gte('scheduled_date', fromIso)
        .lte('scheduled_date', toIso)
        .range(a, b),
    ),
    fetchAllRows<StageRow>((a, b) =>
      client
        .from('lead_stage_history')
        .select('changed_by, to_status, changed_at, lead_uuid')
        .in('to_status', ['kapora-alindi', 'sozlesme-imzalandi'])
        .gte('changed_at', fromIso)
        .lte('changed_at', toIso)
        .range(a, b),
    ),
    fetchAllRows<TaskRow>((a, b) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .from('tasks')
        .select('assigned_to, is_completed')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .range(a, b),
    ),
  ]);

  const salespeople = (salespeopleRes.data ?? []) as SalespersonRow[];

  // ── Per-salesperson team metrics ──────────────────────────────────────────
  const team: TeamMemberMetrics[] = salespeople.map((sp) => {
    const claimed = claims.filter((c) => c.assigned_to === sp.id).length;

    const myContacts = contacts.filter((c) => c.salesperson_id === sp.id);
    const contactedLeads = new Set(myContacts.map((c) => c.lead_uuid)).size;

    let calls = 0;
    let messages = 0;
    let otherContacts = 0;
    for (const c of myContacts) {
      if (c.interaction_type === 'call' || c.interaction_type === 'call_success') calls++;
      else if (c.interaction_type === 'message') messages++;
      else otherContacts++;
    }

    let visitsAttended = 0;
    let visitsFailed = 0;
    for (const v of visits) {
      if (v.created_by !== sp.id) continue;
      if (v.status === 'attended') visitsAttended++;
      else if (v.status === 'failed') visitsFailed++;
    }
    const resolvedVisits = visitsAttended + visitsFailed;

    const downpayments = new Set(
      stageRows
        .filter((s) => s.changed_by === sp.id && s.to_status === 'kapora-alindi')
        .map((s) => s.lead_uuid),
    ).size;
    const dealsSigned = new Set(
      stageRows
        .filter((s) => s.changed_by === sp.id && s.to_status === 'sozlesme-imzalandi')
        .map((s) => s.lead_uuid),
    ).size;

    const myTasks = tasks.filter((t) => t.assigned_to === sp.id);
    const tasksCompleted = myTasks.filter((t) => t.is_completed).length;

    return {
      salespersonId: sp.id,
      fullName: sp.full_name,
      isActive: sp.is_active,
      activeLeadCount: sp.active_lead_count ?? 0,
      claimed,
      contactedLeads,
      visitsAttended,
      visitsFailed,
      showRate:
        resolvedVisits > 0 ? Math.round((visitsAttended / resolvedVisits) * 100) / 100 : null,
      downpayments,
      dealsSigned,
      conversionRate: claimed > 0 ? Math.round((dealsSigned / claimed) * 100) / 100 : null,
      calls,
      messages,
      otherContacts,
      activityTotal: calls + messages + otherContacts,
      tasksCompleted,
      tasksTotal: myTasks.length,
      taskCompletionRate:
        myTasks.length > 0 ? Math.round((tasksCompleted / myTasks.length) * 100) / 100 : null,
    };
  });

  // Most productive first: deals signed, then claims.
  team.sort((a, b) => b.dealsSigned - a.dealsSigned || b.claimed - a.claimed);

  // ── Scope filter for summary + trends ─────────────────────────────────────
  const scopedNewLeads = salespersonId
    ? newLeads.filter((l) => l.assigned_to === salespersonId)
    : newLeads;
  const scopedContacts = salespersonId
    ? contacts.filter((c) => c.salesperson_id === salespersonId)
    : contacts;
  const scopedVisits = salespersonId
    ? visits.filter((v) => v.created_by === salespersonId)
    : visits;
  const scopedDeals = stageRows.filter(
    (s) =>
      s.to_status === 'sozlesme-imzalandi' && (!salespersonId || s.changed_by === salespersonId),
  );

  // ── Daily trend buckets (Istanbul calendar days) ──────────────────────────
  const days = enumerateIstanbulDays(range.from, range.to);
  const trends = {
    days,
    newLeads: bucketByIstanbulDay(
      scopedNewLeads.map((l) => l.created_at),
      days,
    ),
    contacts: bucketByIstanbulDay(
      scopedContacts.map((c) => c.created_at),
      days,
    ),
    visits: bucketByIstanbulDay(
      scopedVisits.map((v) => v.scheduled_date),
      days,
    ),
    dealsSigned: bucketByIstanbulDay(
      scopedDeals.map((s) => s.changed_at),
      days,
    ),
  };

  const summary = {
    newLeads: scopedNewLeads.length,
    contacts: scopedContacts.length,
    visitsAttended: scopedVisits.filter((v) => v.status === 'attended').length,
    dealsSigned: new Set(scopedDeals.map((s) => s.lead_uuid)).size,
  };

  return { range: { from: fromIso, to: toIso }, summary, trends, team };
}
