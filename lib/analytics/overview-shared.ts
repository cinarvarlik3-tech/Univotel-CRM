/**
 * Shared types and query helpers for analytics tab payloads.
 */
import { FUNNEL_STATUSES } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/service';
import { median } from '@/lib/analytics/overview-format';
import type { OverviewDateRange } from '@/lib/analytics/overview-range';

export type ConversionStageDepth = 'kapora-alindi' | 'sozlesme-imzalandi' | 'moved_in';

export interface OverviewPieSlice {
  id: string;
  count: number;
}

export interface OverviewLineSeries {
  days: string[];
  values: number[];
}

/** Percentage line series (0–100) with optional maturing bucket flags. */
export interface OverviewRateLineSeries extends OverviewLineSeries {
  /** Bucket indices still accumulating cohort loss (rate mode only). */
  maturingIndices: number[];
}

export interface OverviewStageBar {
  stage: string;
  medianDays: number | null;
}

export interface OverviewSourceBar {
  id: string;
  count: number;
}

export interface OverviewPropertyOption {
  id: string;
  name: string;
}

export const PAGE_SIZE = 1000;
export const MAX_PAGES = 20;
export const BATCH_UUID_SIZE = 200;

export const CALL_TYPES = new Set(['call', 'whatsapp_call', 'call_success', 'call_fail']);

export async function fetchAllRows<T>(
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

export function toPieSlices(counts: Map<string, number>): OverviewPieSlice[] {
  return [...counts.entries()]
    .filter(([, c]) => c > 0)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

export interface StageHistoryRow {
  lead_uuid: string;
  to_status: string;
  changed_at: string;
}

export interface ContactRow {
  lead_uuid: string;
  created_at: string;
  interaction_type: string;
}

export async function fetchContactsForLeads(
  client: ReturnType<typeof createServiceClient>,
  leadUuids: string[],
): Promise<ContactRow[]> {
  if (leadUuids.length === 0) return [];
  const rows: ContactRow[] = [];
  for (let i = 0; i < leadUuids.length; i += BATCH_UUID_SIZE) {
    const batch = leadUuids.slice(i, i + BATCH_UUID_SIZE);
    const batchRows = await fetchAllRows<ContactRow>((a, b) =>
      client
        .from('contact_history')
        .select('lead_uuid, created_at, interaction_type')
        .in('lead_uuid', batch)
        .order('created_at', { ascending: true })
        .range(a, b),
    );
    rows.push(...batchRows);
  }
  return rows;
}

export async function countEverReached(
  client: ReturnType<typeof createServiceClient>,
  fromIso: string,
  toIso: string,
  stage: ConversionStageDepth,
): Promise<number> {
  if (stage === 'moved_in') {
    const { count } = await client
      .from('leads')
      .select('uuid', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('has_moved_in', true)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    return count ?? 0;
  }

  const leadRows = await fetchAllRows<{ uuid: string }>((a, b) =>
    client
      .from('leads')
      .select('uuid')
      .eq('is_deleted', false)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .range(a, b),
  );
  const uuids = leadRows.map((l) => l.uuid);
  if (uuids.length === 0) return 0;

  const reached = new Set<string>();
  for (let i = 0; i < uuids.length; i += BATCH_UUID_SIZE) {
    const batch = uuids.slice(i, i + BATCH_UUID_SIZE);
    const rows = await fetchAllRows<{ lead_uuid: string }>((a, b) =>
      client
        .from('lead_stage_history')
        .select('lead_uuid')
        .eq('to_status', stage)
        .in('lead_uuid', batch)
        .range(a, b),
    );
    for (const row of rows) reached.add(row.lead_uuid);
  }
  return reached.size;
}

export function computeMedianTimeInStage(
  history: StageHistoryRow[],
  range: OverviewDateRange,
): OverviewStageBar[] {
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  const byLead = new Map<string, StageHistoryRow[]>();

  for (const row of history) {
    const list = byLead.get(row.lead_uuid) ?? [];
    list.push(row);
    byLead.set(row.lead_uuid, list);
  }

  const durationsByStage = new Map<string, number[]>();

  for (const rows of byLead.values()) {
    rows.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    for (let i = 0; i < rows.length; i++) {
      const entry = rows[i]!;
      const entryMs = new Date(entry.changed_at).getTime();
      if (entryMs < fromMs || entryMs > toMs) continue;
      const exit = rows[i + 1];
      if (!exit) continue;
      const days = (new Date(exit.changed_at).getTime() - entryMs) / (24 * 60 * 60 * 1000);
      if (days < 0) continue;
      const list = durationsByStage.get(entry.to_status) ?? [];
      list.push(days);
      durationsByStage.set(entry.to_status, list);
    }
  }

  return FUNNEL_STATUSES.filter((s) => s !== 'lost').map((stage) => ({
    stage,
    medianDays: median(durationsByStage.get(stage) ?? []),
  }));
}
