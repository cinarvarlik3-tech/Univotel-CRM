/**
 * Single source of truth for ALL FMS revenue figures. Read here, nowhere else.
 * Server-only — do not import from client components (use constants.ts / types.ts).
 */
import { UNATTRIBUTED_PARTNER_ID } from '@/lib/finance/constants';
import { applySliceCommission } from '@/lib/finance/slice-commission';
import type {
  CustomerListRow,
  FmsDashboardSelection,
  FmsMetricTriple,
  FmsPieBreakdown,
  FmsPieSlice,
  FmsTotals,
  PartnerLookup,
  PartnerSummary,
  PropertyCustomer,
  PropertyCustomers,
  PropertyLookup,
  PropertyRevenue,
  RoomTypeRevenue,
} from '@/lib/finance/types';
import { calculatePartnerCommission, getPartnerCommissionRate } from '@/lib/finance/commission';
import { createServiceClient } from '@/lib/supabase/service';

export type {
  CustomerListRow,
  FmsDashboardSelection,
  FmsMetricTriple,
  FmsPieBreakdown,
  FmsPieSlice,
  FmsTotals,
  PartnerLookup,
  PartnerSummary,
  PropertyCustomer,
  PropertyCustomers,
  PropertyLookup,
  PropertyRevenue,
  RoomTypeRevenue,
} from '@/lib/finance/types';

export { UNATTRIBUTED_PARTNER_ID } from '@/lib/finance/constants';
export { applySliceCommission } from '@/lib/finance/slice-commission';

type BreakdownRow = {
  partner_id: string | null;
  partner_name: string | null;
  property_id: string;
  property_name: string;
  customer_count: number;
  property_revenue: number;
};

/**
 * Pure rollup from fms_revenue_breakdown rows — exported for unit tests.
 */
export async function rollupBreakdownRows(rows: PropertyRevenue[]): Promise<{
  partners: PartnerSummary[];
  unattributed: PartnerSummary | null;
  grandRevenue: number;
  grandOurCut: number;
  grandProfit: number;
}> {
  const byPartner = new Map<string, PartnerSummary>();
  for (const r of rows) {
    const key = r.partnerId ?? '__unattributed__';
    let p = byPartner.get(key);
    if (!p) {
      p = {
        partnerId: r.partnerId,
        partnerName: r.partnerName ?? 'Unattributed',
        revenue: 0,
        ourCut: 0,
        profit: 0,
        properties: [],
      };
      byPartner.set(key, p);
    }
    p.properties.push(r);
    p.revenue += Number(r.propertyRevenue);
  }

  for (const p of byPartner.values()) {
    p.ourCut = p.partnerId === null ? 0 : await calculatePartnerCommission(p.partnerId, p.revenue);
    p.profit = p.revenue - p.ourCut;
  }

  const unattributed = byPartner.get('__unattributed__') ?? null;
  const partners = [...byPartner.values()]
    .filter((p) => p.partnerId !== null)
    .sort((a, b) => b.revenue - a.revenue);

  const all = [...partners, ...(unattributed ? [unattributed] : [])];
  const grandRevenue = all.reduce((s, p) => s + p.revenue, 0);
  const grandOurCut = all.reduce((s, p) => s + p.ourCut, 0);

  return {
    partners,
    unattributed,
    grandRevenue,
    grandOurCut,
    grandProfit: grandRevenue - grandOurCut,
  };
}

function mapBreakdownRow(row: BreakdownRow): PropertyRevenue {
  return {
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    propertyId: row.property_id,
    propertyName: row.property_name,
    customerCount: Number(row.customer_count),
    propertyRevenue: Number(row.property_revenue),
  };
}

/**
 * Returns FMS dashboard totals and per-partner summaries.
 */
export async function getFmsTotals(includeKapora = false): Promise<FmsTotals> {
  const supa = createServiceClient();
  const { data, error } = await supa.rpc('fms_revenue_breakdown', {
    p_include_kapora: includeKapora,
  });
  if (error) throw error;
  const rows = ((data ?? []) as BreakdownRow[]).map(mapBreakdownRow);
  return rollupBreakdownRows(rows);
}

/**
 * Returns one partner's summary from canonical totals.
 */
export async function getPartnerSummary(
  partnerId: string,
  includeKapora = false,
): Promise<PartnerSummary | null> {
  const totals = await getFmsTotals(includeKapora);
  return totals.partners.find((p) => p.partnerId === partnerId) ?? null;
}

/**
 * Returns the unattributed partner bucket (null-partner properties).
 */
export async function getUnattributed(includeKapora = false): Promise<PartnerSummary | null> {
  return (await getFmsTotals(includeKapora)).unattributed;
}

/**
 * Returns per-customer finance rows for one property via active_finance.
 */
export async function getPropertyCustomers(
  propertyId: string,
  includeKapora = false,
): Promise<PropertyCustomers> {
  const supa = createServiceClient();
  let query = supa
    .from('active_finance')
    .select(
      `
      lead_id,
      monthly_payment,
      discount,
      effective_monthly,
      deal_duration,
      lead_revenue,
      room_types!inner(name, hotel_id),
      leads!inner(display_name, lead_name, lead_phone, funnel_status, has_moved_in)
    `,
    )
    .eq('room_types.hotel_id', propertyId);

  if (!includeKapora) {
    query = query.neq('leads.funnel_status', 'kapora-alindi');
  }

  const { data, error } = await query;

  if (error) throw error;

  type Row = {
    lead_id: string;
    monthly_payment: number;
    discount: number;
    effective_monthly: number;
    deal_duration: number;
    lead_revenue: number;
    room_types: { name: string; hotel_id: string };
    leads: {
      display_name: string | null;
      lead_name: string | null;
      lead_phone: string;
      funnel_status: string;
      has_moved_in: boolean;
    };
  };

  const customers: PropertyCustomer[] = ((data ?? []) as Row[]).map((row) => ({
    leadId: row.lead_id,
    name: row.leads.display_name ?? row.leads.lead_name,
    phone: row.leads.lead_phone,
    funnelStatus: row.leads.funnel_status,
    hasMovedIn: row.leads.has_moved_in,
    roomTypeName: row.room_types.name,
    monthlyPayment: Number(row.monthly_payment),
    discount: Number(row.discount),
    effectiveMonthly: Number(row.effective_monthly),
    dealDuration: Number(row.deal_duration),
    leadRevenue: Number(row.lead_revenue),
  }));

  const propertyRevenue = customers.reduce((sum, c) => sum + c.leadRevenue, 0);

  return {
    propertyId,
    customers,
    propertyRevenue,
    customerCount: customers.length,
  };
}

type RoomTypeBreakdownRow = {
  room_type_id: string;
  room_type_name: string;
  customer_count: number;
  room_type_revenue: number;
};

/**
 * Per-room-type revenue for one property (pie chart room-type mode).
 */
export async function getPropertyRoomTypeBreakdown(
  propertyId: string,
  includeKapora = false,
): Promise<RoomTypeRevenue[]> {
  const supa = createServiceClient();
  const { data, error } = await supa.rpc('fms_property_roomtype_breakdown', {
    p_property_id: propertyId,
    p_include_kapora: includeKapora,
  });
  if (error) throw error;
  return ((data ?? []) as RoomTypeBreakdownRow[]).map((row) => ({
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name,
    customerCount: Number(row.customer_count),
    roomTypeRevenue: Number(row.room_type_revenue),
  }));
}

/**
 * Resolves the partner summary for a selection (partner or unattributed bucket).
 */
async function resolvePartnerBucket(
  selection: FmsDashboardSelection,
  includeKapora: boolean,
): Promise<PartnerSummary | null> {
  if (selection.scope === 'partner') {
    return getPartnerSummary(selection.partnerId, includeKapora);
  }
  if (selection.scope === 'unattributed') {
    return getUnattributed(includeKapora);
  }
  return null;
}

/**
 * Triple-box metrics for the current FMS dashboard selection.
 */
export async function getFmsMetricTriple(
  selection: FmsDashboardSelection,
  includeKapora = false,
): Promise<FmsMetricTriple> {
  if (selection.scope === 'all') {
    const totals = await getFmsTotals(includeKapora);
    return {
      revenue: totals.grandRevenue,
      ourCut: totals.grandOurCut,
      profit: totals.grandProfit,
    };
  }

  if (selection.scope === 'property') {
    const totals = await getFmsTotals(includeKapora);
    const allProps = [
      ...totals.partners.flatMap((p) => p.properties),
      ...(totals.unattributed?.properties ?? []),
    ];
    const prop = allProps.find((p) => p.propertyId === selection.propertyId);
    const revenue = prop?.propertyRevenue ?? 0;
    const ourCut =
      selection.partnerId === null
        ? 0
        : await calculatePartnerCommission(selection.partnerId, revenue);
    return { revenue, ourCut, profit: revenue - ourCut };
  }

  const bucket = await resolvePartnerBucket(selection, includeKapora);
  if (!bucket) return { revenue: 0, ourCut: 0, profit: 0 };
  return { revenue: bucket.revenue, ourCut: bucket.ourCut, profit: bucket.profit };
}

/**
 * Pie-chart slices for the current FMS dashboard selection.
 */
export async function getFmsPieBreakdown(
  selection: FmsDashboardSelection,
  includeKapora = false,
): Promise<FmsPieBreakdown> {
  if (selection.scope === 'property') {
    const roomTypes = await getPropertyRoomTypeBreakdown(selection.propertyId, includeKapora);
    const rate =
      selection.partnerId === null ? 0 : await getPartnerCommissionRate(selection.partnerId);
    const slices: FmsPieSlice[] = roomTypes.map((rt) => {
      const metrics = applySliceCommission(rt.roomTypeRevenue, rate);
      return {
        id: rt.roomTypeId,
        name: rt.roomTypeName,
        customerCount: rt.customerCount,
        ...metrics,
      };
    });
    return { mode: 'roomType', slices, commissionRate: rate };
  }

  if (selection.scope === 'partner' || selection.scope === 'unattributed') {
    const bucket = await resolvePartnerBucket(selection, includeKapora);
    const rate =
      selection.scope === 'unattributed' || !bucket?.partnerId
        ? 0
        : await getPartnerCommissionRate(bucket.partnerId);
    const slices: FmsPieSlice[] = (bucket?.properties ?? []).map((p) => {
      const metrics = applySliceCommission(p.propertyRevenue, rate);
      return {
        id: p.propertyId,
        name: p.propertyName,
        customerCount: p.customerCount,
        ...metrics,
      };
    });
    return { mode: 'property', slices, commissionRate: rate };
  }

  const totals = await getFmsTotals(includeKapora);
  const rateCache = new Map<string, number>();
  const slices: FmsPieSlice[] = [];

  for (const partner of totals.partners) {
    let rate = rateCache.get(partner.partnerId!);
    if (rate === undefined) {
      rate = await getPartnerCommissionRate(partner.partnerId!);
      rateCache.set(partner.partnerId!, rate);
    }
    for (const prop of partner.properties) {
      const metrics = applySliceCommission(prop.propertyRevenue, rate);
      slices.push({
        id: prop.propertyId,
        name: prop.propertyName,
        customerCount: prop.customerCount,
        ...metrics,
      });
    }
  }

  for (const prop of totals.unattributed?.properties ?? []) {
    const metrics = applySliceCommission(prop.propertyRevenue, 0);
    slices.push({
      id: prop.propertyId,
      name: prop.propertyName,
      customerCount: prop.customerCount,
      ...metrics,
    });
  }

  return { mode: 'property', slices, commissionRate: 0 };
}

/**
 * Customer rows for the FMS dashboard list (property-scoped via getPropertyCustomers).
 */
export async function getFmsCustomerList(
  selection: FmsDashboardSelection,
  includeKapora = false,
): Promise<CustomerListRow[]> {
  const propertyIds: { id: string; name: string }[] = [];

  if (selection.scope === 'property') {
    const totals = await getFmsTotals(includeKapora);
    const allProps = [
      ...totals.partners.flatMap((p) => p.properties),
      ...(totals.unattributed?.properties ?? []),
    ];
    const prop = allProps.find((p) => p.propertyId === selection.propertyId);
    propertyIds.push({
      id: selection.propertyId,
      name: prop?.propertyName ?? selection.propertyId,
    });
  } else if (selection.scope === 'partner' || selection.scope === 'unattributed') {
    const bucket = await resolvePartnerBucket(selection, includeKapora);
    for (const p of bucket?.properties ?? []) {
      propertyIds.push({ id: p.propertyId, name: p.propertyName });
    }
  } else {
    const totals = await getFmsTotals(includeKapora);
    for (const partner of totals.partners) {
      for (const p of partner.properties) {
        propertyIds.push({ id: p.propertyId, name: p.propertyName });
      }
    }
    for (const p of totals.unattributed?.properties ?? []) {
      propertyIds.push({ id: p.propertyId, name: p.propertyName });
    }
  }

  const rows: CustomerListRow[] = [];
  const customerBatches = await Promise.all(
    propertyIds.map(async (prop) => {
      const { customers } = await getPropertyCustomers(prop.id, includeKapora);
      return customers.map((c) => ({ ...c, propertyId: prop.id, propertyName: prop.name }));
    }),
  );
  for (const batch of customerBatches) {
    rows.push(...batch);
  }

  return rows.sort((a, b) => b.leadRevenue - a.leadRevenue);
}

/**
 * Partner names for FMS search dropdown (includes Unattributed sentinel).
 */
export async function getFmsPartnerLookup(): Promise<PartnerLookup[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from('partners')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  const partners = (data ?? []).map((p) => ({ id: p.id, name: p.name }));
  return [...partners, { id: UNATTRIBUTED_PARTNER_ID, name: '__unattributed__' }];
}

/**
 * Property names for FMS search dropdown, optionally filtered by partner.
 */
export async function getFmsPropertyLookup(
  partnerFilter?: string | null,
): Promise<PropertyLookup[]> {
  const supa = createServiceClient();
  let query = supa.from('properties').select('id, hotel_name, partner_id').order('hotel_name');

  if (partnerFilter === UNATTRIBUTED_PARTNER_ID) {
    query = query.is('partner_id', null);
  } else if (partnerFilter) {
    query = query.eq('partner_id', partnerFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.hotel_name,
    partnerId: p.partner_id,
  }));
}
