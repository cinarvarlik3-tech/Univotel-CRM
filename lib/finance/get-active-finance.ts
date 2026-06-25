/**
 * Reads active finance terms for a lead (manager UI pre-fill).
 */
import { createServiceClient } from '@/lib/supabase/service';
import { moveInMonthFromDate } from '@/lib/finance/move-in-month';

export type ActiveFinanceSummary = {
  moveInMonth: string;
  dealDuration: number;
  discount: number;
  purchasedRoom: string;
};

/**
 * Returns active finance terms for a lead, or null when no active row exists.
 */
export async function getActiveFinanceForLead(
  leadId: string,
): Promise<ActiveFinanceSummary | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from('active_finance')
    .select('move_in_month, deal_duration, discount, purchased_room')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const moveInMonth = moveInMonthFromDate(data.move_in_month);
  if (!moveInMonth || data.deal_duration == null || data.discount == null || !data.purchased_room) {
    throw new Error('Active finance row is incomplete');
  }

  return {
    moveInMonth,
    dealDuration: data.deal_duration,
    discount: Number(data.discount),
    purchasedRoom: data.purchased_room,
  };
}
