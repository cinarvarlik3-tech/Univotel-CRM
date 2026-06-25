/**
 * Resolves seasonal price for a room type + move-in month (manager API helper).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createServiceClient } from '@/lib/supabase/service';
import { toMoveInMonthDate } from '@/lib/finance/move-in-month';

type ServiceClient = SupabaseClient<Database>;

export async function resolvePriceForMonth(
  supa: ServiceClient,
  roomTypeId: string,
  moveInMonth: string,
): Promise<number | null> {
  const { data, error } = await supa.rpc('fms_price_for_month', {
    p_room_type_id: roomTypeId,
    p_move_in_month: toMoveInMonthDate(moveInMonth),
  });
  if (error) throw new Error(error.message);
  return data == null ? null : Number(data);
}

/**
 * Resolves seasonal price using the service-role client (API route entry point).
 */
export async function fetchPriceForMonth(
  roomTypeId: string,
  moveInMonth: string,
): Promise<number | null> {
  return resolvePriceForMonth(createServiceClient(), roomTypeId, moveInMonth);
}
