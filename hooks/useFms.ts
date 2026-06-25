/**
 * SWR hooks for FMS pages.
 */
import useSWR from 'swr';
import { useFmsFilter } from '@/components/finance/FmsFilterContext';
import type {
  CustomerListRow,
  FmsMetricTriple,
  FmsPieBreakdown,
  FmsTotals,
  PartnerLookup,
  PartnerSummary,
  PropertyCustomers,
  PropertyLookup,
} from '@/lib/finance/types';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

function kaporaQuery(includeKapora: boolean): string {
  return includeKapora ? '?includeKapora=true' : '';
}

function selectionQuery(
  partnerId: string | null,
  propertyId: string | null,
  includeKapora: boolean,
): string {
  const params = new URLSearchParams();
  if (includeKapora) params.set('includeKapora', 'true');
  if (partnerId) params.set('partnerId', partnerId);
  if (propertyId) params.set('propertyId', propertyId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export type FmsDashboardPayload = {
  metrics: FmsMetricTriple;
  pie: FmsPieBreakdown;
  customers: CustomerListRow[];
};

export type FmsLookupsPayload = {
  partners: PartnerLookup[];
  properties: PropertyLookup[];
};

/** Dashboard metrics, pie, and customer list for current selection. */
export function useFmsDashboard(partnerId: string | null, propertyId: string | null) {
  const { includeKapora } = useFmsFilter();
  return useSWR<FmsDashboardPayload>(
    `/api/fms/dashboard${selectionQuery(partnerId, propertyId, includeKapora)}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );
}

/** Partner/property lookup lists for search bars. */
export function useFmsLookups(partnerId: string | null) {
  const params = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : '';
  return useSWR<FmsLookupsPayload>(`/api/fms/lookups${params}`, fetcher);
}

/** Dashboard totals and per-partner rollups. */
export function useFmsTotals() {
  const { includeKapora } = useFmsFilter();
  return useSWR<FmsTotals>(`/api/fms/totals${kaporaQuery(includeKapora)}`, fetcher);
}

/** Single partner summary. */
export function useFmsPartner(partnerId: string | null) {
  const { includeKapora } = useFmsFilter();
  return useSWR<PartnerSummary>(
    partnerId ? `/api/fms/${partnerId}${kaporaQuery(includeKapora)}` : null,
    fetcher,
  );
}

/** Unattributed bucket. */
export function useFmsUnattributed() {
  const { includeKapora } = useFmsFilter();
  return useSWR<PartnerSummary | null>(
    `/api/fms/unattributed${kaporaQuery(includeKapora)}`,
    fetcher,
  );
}

/** Per-customer rows for a property. */
export function useFmsPropertyCustomers(propertyId: string | null) {
  const { includeKapora } = useFmsFilter();
  return useSWR<PropertyCustomers>(
    propertyId ? `/api/fms/properties/${propertyId}${kaporaQuery(includeKapora)}` : null,
    fetcher,
  );
}

export type RoomTypePriceRow = {
  id: string;
  room_type_id: string;
  price: number;
  valid_from_month: string;
  valid_until_month: string | null;
  label: string | null;
};

export type RoomTypePricesPayload = {
  roomTypes: { id: string; name: string }[];
  prices: RoomTypePriceRow[];
};

/** Seasonal price periods for one property's room types. */
export function useRoomTypePrices(propertyId: string | null) {
  return useSWR<RoomTypePricesPayload>(
    propertyId ? `/api/fms/room-type-prices?propertyId=${propertyId}` : null,
    fetcher,
  );
}
