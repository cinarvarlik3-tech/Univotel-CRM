/**
 * Purchased room type helpers — set purchased_room on lead_details for funnel integration.
 */
import { purchasedRoomAdvanceMode } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/service';

export type PurchasedRoomAdvanceMode = 'required' | 'confirm' | null;

export { purchasedRoomAdvanceMode };

/**
 * Sets purchased_room (room type UUID) on lead_details for a lead.
 */
export async function setPurchasedRoom(opts: {
  leadId: string;
  roomTypeId: string;
}): Promise<void> {
  const client = createServiceClient();

  const { data: roomType, error: typeError } = await client
    .from('room_types')
    .select('id')
    .eq('id', opts.roomTypeId)
    .eq('is_active', true)
    .maybeSingle();

  if (typeError) throw new Error(`Failed to validate room type: ${typeError.message}`);
  if (!roomType) throw new Error('Geçersiz oda tipi');

  const { error } = await client
    .from('lead_details')
    .update({ purchased_room: opts.roomTypeId })
    .eq('lead_uuid', opts.leadId);

  if (error) throw new Error(`Failed to set purchased room: ${error.message}`);
}

/**
 * Resolves purchased_room UUID for a stage advance — uses body value or existing lead_details row.
 */
export async function resolvePurchasedRoomForAdvance(opts: {
  leadId: string;
  fromStatus: string;
  toStatus: string;
  purchasedRoom?: string;
}): Promise<string | null> {
  const mode = purchasedRoomAdvanceMode(opts.fromStatus, opts.toStatus);
  if (!mode) return opts.purchasedRoom ?? null;

  const client = createServiceClient();
  const { data: details, error } = await client
    .from('lead_details')
    .select('purchased_room')
    .eq('lead_uuid', opts.leadId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch lead details: ${error.message}`);

  const existing = details?.purchased_room as string | null | undefined;
  const next = opts.purchasedRoom ?? existing ?? null;

  if (mode === 'required' && !next) {
    throw new Error('Kapora için oda tipi seçilmelidir');
  }
  if (mode === 'confirm' && !next) {
    throw new Error('Sözleşme için oda tipi onaylanmalıdır');
  }

  return next;
}
