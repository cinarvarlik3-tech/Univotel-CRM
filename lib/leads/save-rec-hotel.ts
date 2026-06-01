/**
 * Persists Make.com hotel recommendation results onto lead_details.rec_hotel.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { RecHotelItem } from '@/types/domain';
import type { Json } from '@/types/database';

/** Outcome of saving recommendations for a lead. */
export type SaveRecHotelResult = 'ok' | 'not_found' | 'error';

/**
 * Upserts rec_hotel jsonb for an active lead (service role — bypasses RLS).
 * @param leadUuid - Target lead UUID.
 * @param recommendations - Up to three recommendation objects from Make.com.
 * @returns ok, not_found when lead missing/deleted, or error on DB failure.
 */
export async function saveLeadRecHotel(
  leadUuid: string,
  recommendations: RecHotelItem[],
): Promise<SaveRecHotelResult> {
  const supabase = createServiceClient();

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('uuid')
    .eq('uuid', leadUuid)
    .eq('is_deleted', false)
    .maybeSingle();

  if (leadError) {
    return 'error';
  }

  if (!lead) {
    return 'not_found';
  }

  const { error: upsertError } = await supabase.from('lead_details').upsert(
    {
      lead_uuid: leadUuid,
      rec_hotel: recommendations as unknown as Json,
    },
    { onConflict: 'lead_uuid' },
  );

  if (upsertError) {
    return 'error';
  }

  return 'ok';
}
