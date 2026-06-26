/**
 * Salesperson leaderboard — ranked team metrics for all active reps.
 * Called by GET /api/analytics/salesperson-leaderboard (manager/superadmin only).
 *
 * Uses the same "fetch all, compute in memory" pattern as manager-panel.ts.
 * True totals (team grand totals) are NOT averages of per-rep values.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { fetchAllRows, CALL_TYPES } from '@/lib/analytics/overview-shared';
import type { OverviewDateRange } from '@/lib/analytics/overview-range';

export type LeaderboardSortKey =
  | 'revenue'
  | 'leads'
  | 'messages'
  | 'conversion'
  | 'visits'
  | 'sales'
  | 'lateness';

export interface LeaderboardRow {
  salespersonId: string;
  fullName: string;
  isActive: boolean;
  contractedRevenue: number;
  leadCount: number;
  messageCount: number;
  conversionRate: number | null;
  visitCount: number;
  saleCount: number;
  avgDiscountPct: number | null;
  lossCount: number;
  latenessRate: number | null;
  touchPerLead: number | null;
  avgCycleDays: number | null;
}

export interface TeamTotals {
  contractedRevenue: number;
  avgDiscountPct: number | null;
  latenessRate: number | null;
  avgCycleDays: number | null;
}

export interface SalespersonLeaderboardPayload {
  range: { from: string; to: string };
  teamTotals: TeamTotals;
  rows: LeaderboardRow[];
}

interface StageRow {
  lead_uuid: string;
  changed_by: string | null;
  to_status: string;
  changed_at: string;
}

interface LeadRow {
  uuid: string;
  created_at: string;
  assigned_to: string | null;
  claimed_at: string | null;
}

interface ContactRow {
  lead_uuid: string;
  salesperson_id: string | null;
  interaction_type: string;
  created_at: string;
}

interface VisitRow {
  created_by: string | null;
  status: string;
  scheduled_date: string;
}

interface MessageRow {
  lead_uuid: string;
  created_at: string;
  sender_agent_id: string | null;
}

interface FinanceRow {
  lead_id: string | null;
  monthly_payment: number | null;
  deal_duration: number | null;
  discount: number | null;
  lead_revenue: number | null;
}

interface TaskRow {
  assigned_to: string;
  is_completed: boolean;
  due_when: string;
}

interface SalespersonRow {
  id: string;
  full_name: string;
  is_active: boolean;
  role: string;
  chatwoot_user_id: number | null;
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

export async function getSalespersonLeaderboard(
  range: OverviewDateRange,
  sort: LeaderboardSortKey,
  _includeKapora: boolean,
): Promise<SalespersonLeaderboardPayload> {
  void _includeKapora; // kapora filter not yet implemented — param kept for API compatibility
  const client = createServiceClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();
  const now = new Date();

  const [salespeople, allLeads, allStage, allContacts, allVisits, allMessages, allTasks] =
    await Promise.all([
      fetchAllRows<SalespersonRow>((a, b) =>
        client
          .from('salespeople')
          .select('id, full_name, is_active, role, chatwoot_user_id')
          .in('role', ['salesperson', 'manager', 'superadmin', 'operator'])
          .range(a, b),
      ),

      fetchAllRows<LeadRow>((a, b) =>
        client
          .from('leads')
          .select('uuid, created_at, assigned_to, claimed_at')
          .eq('is_deleted', false)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .range(a, b),
      ),

      fetchAllRows<StageRow>((a, b) =>
        client
          .from('lead_stage_history')
          .select('lead_uuid, changed_by, to_status, changed_at')
          .gte('changed_at', fromIso)
          .lte('changed_at', toIso)
          .range(a, b),
      ),

      fetchAllRows<ContactRow>((a, b) =>
        client
          .from('contact_history')
          .select('lead_uuid, salesperson_id, interaction_type, created_at')
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

      fetchAllRows<MessageRow>((a, b) =>
        client
          .from('lead_messages')
          .select('lead_uuid, created_at, sender_agent_id')
          .eq('direction', 'outgoing')
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .range(a, b),
      ),

      fetchAllRows<TaskRow>((a, b) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client as any)
          .from('tasks')
          .select('assigned_to, is_completed, due_when')
          .eq('is_cancelled', false)
          .gte('due_when', fromIso)
          .lte('due_when', toIso)
          .range(a, b),
      ),
    ]);

  // Fetch finance for all signed deals
  const allSignedLeadUuids = [
    ...new Set(
      allStage.filter((s) => s.to_status === 'sozlesme-imzalandi').map((s) => s.lead_uuid),
    ),
  ];
  const allFinance = await fetchFinanceForLeads(client, allSignedLeadUuids);
  const financeByLead = new Map(allFinance.map((f) => [f.lead_id, f]));

  // First-owner per lead (earliest stage row by lead in window)
  const stagesByLead = new Map<string, StageRow[]>();
  for (const s of allStage) {
    const list = stagesByLead.get(s.lead_uuid) ?? [];
    list.push(s);
    stagesByLead.set(s.lead_uuid, list);
  }
  const firstOwnerByLead = new Map<string, string | null>();
  for (const [uuid, rows] of stagesByLead) {
    rows.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    firstOwnerByLead.set(uuid, rows[0]?.changed_by ?? null);
  }

  // Lead map for intake lookup
  const leadMap = new Map(allLeads.map((l) => [l.uuid, l]));

  // Outbound message counts keyed by Chatwoot agent id (sender_agent_id is a string
  // holding the Chatwoot user id, NOT the salespeople uuid — join via chatwoot_user_id).
  const messagesByAgentId = new Map<string, number>();
  for (const m of allMessages) {
    if (m.sender_agent_id == null) continue;
    messagesByAgentId.set(m.sender_agent_id, (messagesByAgentId.get(m.sender_agent_id) ?? 0) + 1);
  }

  // Compute per-rep rows
  const rows: LeaderboardRow[] = salespeople.map((sp) => {
    // Lead count (intake owner)
    const intakeLeads = allLeads.filter((l) => {
      const owner = firstOwnerByLead.get(l.uuid);
      return owner === sp.id || (owner == null && l.assigned_to === sp.id);
    });
    const leadCount = intakeLeads.length;

    // Signed deals
    const signedLeadUuids = [
      ...new Set(
        allStage
          .filter((s) => s.to_status === 'sozlesme-imzalandi' && s.changed_by === sp.id)
          .map((s) => s.lead_uuid),
      ),
    ];
    const saleCount = signedLeadUuids.length;
    const conversionRate = leadCount > 0 ? Math.round((saleCount / leadCount) * 1000) / 10 : null;

    // Revenue
    let contractedRevenue = 0;
    let totalDiscountPct = 0;
    let discountDeals = 0;
    for (const uuid of signedLeadUuids) {
      const f = financeByLead.get(uuid);
      if (!f) continue;
      contractedRevenue += f.lead_revenue ?? (f.monthly_payment ?? 0) * (f.deal_duration ?? 0);
      const mp = f.monthly_payment ?? 0;
      if (mp > 0) totalDiscountPct += ((f.discount ?? 0) / mp) * 100;
      discountDeals++;
    }
    const avgDiscountPct =
      discountDeals > 0 ? Math.round((totalDiscountPct / discountDeals) * 10) / 10 : null;

    // Visits
    const spVisits = allVisits.filter((v) => v.created_by === sp.id);
    const visitCount = spVisits.length;

    // Messages
    const messageCount =
      sp.chatwoot_user_id != null ? (messagesByAgentId.get(String(sp.chatwoot_user_id)) ?? 0) : 0;

    // Loss
    const lossCount = new Set(
      allStage
        .filter((s) => s.to_status === 'lost' && s.changed_by === sp.id)
        .map((s) => s.lead_uuid),
    ).size;

    // Tasks / lateness
    const spTasks = allTasks.filter((t) => t.assigned_to === sp.id);
    const lateTasks = spTasks.filter(
      (t) => !t.is_completed && new Date(t.due_when).getTime() < now.getTime(),
    );
    const latenessRate =
      spTasks.length > 0 ? Math.round((lateTasks.length / spTasks.length) * 1000) / 10 : null;

    // Touch per lead
    const callCount = allContacts.filter(
      (c) => c.salesperson_id === sp.id && CALL_TYPES.has(c.interaction_type),
    ).length;
    const touchPerLead =
      leadCount > 0 ? Math.round(((messageCount + callCount) / leadCount) * 10) / 10 : null;

    // Avg cycle
    const signedEvents = allStage.filter(
      (s) => s.to_status === 'sozlesme-imzalandi' && s.changed_by === sp.id,
    );
    const cycleDays: number[] = [];
    for (const s of signedEvents) {
      const lead = leadMap.get(s.lead_uuid);
      if (!lead) continue;
      const start = lead.claimed_at ?? lead.created_at;
      const d =
        (new Date(s.changed_at).getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000);
      if (d >= 0) cycleDays.push(d);
    }
    const avgCycleDays =
      cycleDays.length > 0
        ? Math.round((cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) * 10) / 10
        : null;

    return {
      salespersonId: sp.id,
      fullName: sp.full_name,
      isActive: sp.is_active,
      contractedRevenue,
      leadCount,
      messageCount,
      conversionRate,
      visitCount,
      saleCount,
      avgDiscountPct,
      lossCount,
      latenessRate,
      touchPerLead,
      avgCycleDays,
    };
  });

  // Sort
  rows.sort((a, b) => {
    switch (sort) {
      case 'leads':
        return b.leadCount - a.leadCount;
      case 'messages':
        return b.messageCount - a.messageCount;
      case 'conversion':
        return (b.conversionRate ?? -1) - (a.conversionRate ?? -1);
      case 'visits':
        return b.visitCount - a.visitCount;
      case 'sales':
        return b.saleCount - a.saleCount;
      case 'lateness':
        return (b.latenessRate ?? -1) - (a.latenessRate ?? -1);
      case 'revenue':
      default:
        return b.contractedRevenue - a.contractedRevenue;
    }
  });

  // Team true totals
  const teamRevenue = allFinance.reduce(
    (s, f) => s + (f.lead_revenue ?? (f.monthly_payment ?? 0) * (f.deal_duration ?? 0)),
    0,
  );
  const teamDiscountPcts = allFinance
    .filter((f) => (f.monthly_payment ?? 0) > 0)
    .map((f) => ((f.discount ?? 0) / (f.monthly_payment ?? 1)) * 100);
  const teamAvgDiscount =
    teamDiscountPcts.length > 0
      ? Math.round((teamDiscountPcts.reduce((a, b) => a + b, 0) / teamDiscountPcts.length) * 10) /
        10
      : null;

  const totalLateTasks = allTasks.filter(
    (t) => !t.is_completed && new Date(t.due_when).getTime() < now.getTime(),
  ).length;
  const teamLatenessRate =
    allTasks.length > 0 ? Math.round((totalLateTasks / allTasks.length) * 1000) / 10 : null;

  // Team avg cycle
  const allCycleDays: number[] = [];
  for (const s of allStage.filter((st) => st.to_status === 'sozlesme-imzalandi')) {
    const lead = leadMap.get(s.lead_uuid);
    if (!lead) continue;
    const start = lead.claimed_at ?? lead.created_at;
    const d =
      (new Date(s.changed_at).getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000);
    if (d >= 0) allCycleDays.push(d);
  }
  const teamAvgCycle =
    allCycleDays.length > 0
      ? Math.round((allCycleDays.reduce((a, b) => a + b, 0) / allCycleDays.length) * 10) / 10
      : null;

  return {
    range: { from: fromIso, to: toIso },
    teamTotals: {
      contractedRevenue: teamRevenue,
      avgDiscountPct: teamAvgDiscount,
      latenessRate: teamLatenessRate,
      avgCycleDays: teamAvgCycle,
    },
    rows,
  };
}
