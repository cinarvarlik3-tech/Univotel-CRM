/**
 * Partner commission chokepoint — v1 flat percentage from partners.commission_percentage.
 * All FMS commission math routes through calculatePartnerCommission().
 */
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Returns the partner's flat commission rate as a 0–1 fraction.
 */
export async function getPartnerCommissionRate(partnerId: string): Promise<number> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from('partners')
    .select('commission_percentage')
    .eq('id', partnerId)
    .single();
  if (error || !data || data.commission_percentage == null) return 0;
  return Number(data.commission_percentage) / 100;
}

/**
 * Computes Univotel's cut for a partner given their aggregated revenue.
 * @param partnerId - Partner UUID.
 * @param partnerRevenue - Total revenue attributed to the partner.
 * @returns Commission amount in TRY; 0 when rate is null/0 or partner not found.
 */
export async function calculatePartnerCommission(
  partnerId: string,
  partnerRevenue: number,
): Promise<number> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from('partners')
    .select('commission_percentage')
    .eq('id', partnerId)
    .single();
  if (error || !data || data.commission_percentage == null) return 0;
  return partnerRevenue * (Number(data.commission_percentage) / 100);
}
