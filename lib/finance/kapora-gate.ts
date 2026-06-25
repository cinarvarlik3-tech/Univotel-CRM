/**
 * Kapora finance validation — blocks advance to kapora-alindi unless finance inputs are ready.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { toMoveInMonthDate, defaultMoveInMonth } from '@/lib/finance/move-in-month';

export type KaporaFinanceInput = {
  purchasedRoom: string;
  moveInMonth: string;
  dealDuration: number;
  discount: number;
};

export const DEFAULT_DEAL_DURATION = 9;
export const DEFAULT_DISCOUNT = 0;

/**
 * Validates kapora finance prerequisites and returns the resolved seasonal monthly price.
 */
export async function assertKaporaFinanceReady(
  supa: SupabaseClient<Database>,
  leadId: string,
  input: KaporaFinanceInput,
): Promise<number> {
  const dealDuration = input.dealDuration ?? DEFAULT_DEAL_DURATION;
  const discount = input.discount ?? DEFAULT_DISCOUNT;

  if (!input.purchasedRoom) {
    throw new Error('Kapora için oda tipi seçilmelidir');
  }
  if (!input.moveInMonth) {
    throw new Error('Taşınma ayı (YYYY-MM) gereklidir');
  }
  if (dealDuration < 1 || dealDuration > 12) {
    throw new Error('Sözleşme süresi 1–12 ay arasında olmalıdır');
  }

  const { data: details, error: detailsError } = await supa
    .from('lead_details')
    .select('purchased_room')
    .eq('lead_uuid', leadId)
    .maybeSingle();

  if (detailsError) {
    throw new Error(`Lead detayları okunamadı: ${detailsError.message}`);
  }

  const purchasedRoom = input.purchasedRoom ?? details?.purchased_room;
  if (!purchasedRoom) {
    throw new Error('Kapora için satın alınan oda tanımlı değil');
  }

  const moveInDate = toMoveInMonthDate(input.moveInMonth);
  const { data: monthlyPayment, error: priceError } = await supa.rpc('fms_price_for_month', {
    p_room_type_id: purchasedRoom,
    p_move_in_month: moveInDate,
  });

  if (priceError) {
    throw new Error(`Fiyat okunamadı: ${priceError.message}`);
  }
  if (monthlyPayment == null) {
    throw new Error(
      `Seçilen oda için ${input.moveInMonth} ayına tanımlı fiyat yok — önce dönem fiyatı girin`,
    );
  }

  const price = Number(monthlyPayment);
  if (discount < 0 || discount > price) {
    throw new Error('İndirim 0 ile aylık ödeme arasında olmalıdır');
  }

  return price;
}

/**
 * Normalizes optional finance inputs with kapora defaults.
 */
export function normalizeFinanceTerms(input: {
  moveInMonth?: string;
  dealDuration?: number;
  discount?: number;
}): { moveInMonth: string; dealDuration: number; discount: number } {
  return {
    moveInMonth: input.moveInMonth ?? defaultMoveInMonth(),
    dealDuration: input.dealDuration ?? DEFAULT_DEAL_DURATION,
    discount: input.discount ?? DEFAULT_DISCOUNT,
  };
}
