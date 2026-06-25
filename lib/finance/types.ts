/**
 * FMS shared types — safe to import from client components (no server deps).
 */

export type PropertyRevenue = {
  partnerId: string | null;
  partnerName: string | null;
  propertyId: string;
  propertyName: string;
  customerCount: number;
  propertyRevenue: number;
};

export type PartnerSummary = {
  partnerId: string | null;
  partnerName: string;
  revenue: number;
  ourCut: number;
  profit: number;
  properties: PropertyRevenue[];
};

export type FmsTotals = {
  partners: PartnerSummary[];
  unattributed: PartnerSummary | null;
  grandRevenue: number;
  grandOurCut: number;
  grandProfit: number;
};

export type PropertyCustomer = {
  leadId: string;
  name: string | null;
  phone: string;
  funnelStatus: string;
  hasMovedIn: boolean;
  roomTypeName: string;
  monthlyPayment: number;
  discount: number;
  effectiveMonthly: number;
  dealDuration: number;
  leadRevenue: number;
};

export type PropertyCustomers = {
  propertyId: string;
  customers: PropertyCustomer[];
  propertyRevenue: number;
  customerCount: number;
};

export type FmsMetricTriple = {
  revenue: number;
  ourCut: number;
  profit: number;
};

export type FmsPieSlice = {
  id: string;
  name: string;
  customerCount: number;
  revenue: number;
  ourCut: number;
  profit: number;
};

export type FmsPieBreakdown = {
  mode: 'partner' | 'property' | 'roomType';
  slices: FmsPieSlice[];
  commissionRate: number;
};

export type CustomerListRow = PropertyCustomer & {
  propertyId: string;
  propertyName: string;
};

export type PartnerLookup = { id: string; name: string };
export type PropertyLookup = { id: string; name: string; partnerId: string | null };

export type RoomTypeRevenue = {
  roomTypeId: string;
  roomTypeName: string;
  customerCount: number;
  roomTypeRevenue: number;
};

export type FmsDashboardSelection =
  | { scope: 'all' }
  | { scope: 'partner'; partnerId: string }
  | { scope: 'unattributed' }
  | { scope: 'property'; propertyId: string; partnerId: string | null };
