/**
 * One-way sync helpers: univotel hotels/room_types → CRM properties/room_types.
 * Used by the sync-univotel Edge Function and the reconciliation cron.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** Supabase Database Webhook payload shape. */
export interface UnivotelWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export interface SyncResult {
  table: string;
  action: string;
  id?: string;
}

type UnivotelHotel = {
  id: string;
  name: string;
  address: string | null;
  district: string | null;
  is_visible: boolean | null;
};

type UnivotelRoomType = {
  id: string;
  hotel_id: string;
  name: string;
  size_m2: number | null;
  person_count: number;
};

function mapHotelStatus(isVisible: boolean | null): 'active' | 'paused' {
  return isVisible === false ? 'paused' : 'active';
}

export { mapHotelStatus };

/**
 * Upserts a univotel hotel row into CRM properties.
 */
export async function upsertPropertyFromHotel(
  crm: SupabaseClient,
  hotel: UnivotelHotel,
): Promise<SyncResult> {
  const status = mapHotelStatus(hotel.is_visible);
  const { error } = await crm.from('properties').upsert(
    {
      id: hotel.id,
      hotel_name: hotel.name,
      address: hotel.address,
      district: hotel.district,
      status,
      is_available: status === 'active',
    },
    { onConflict: 'id' },
  );

  if (error) throw new Error(`properties upsert failed: ${error.message}`);
  return { table: 'properties', action: 'upsert', id: hotel.id };
}

/**
 * Soft-deactivates a property (sync DELETE from univotel).
 */
export async function softDeactivateProperty(
  crm: SupabaseClient,
  hotelId: string,
): Promise<SyncResult> {
  const { error } = await crm
    .from('properties')
    .update({ status: 'closed', is_available: false })
    .eq('id', hotelId);

  if (error) throw new Error(`properties soft-deactivate failed: ${error.message}`);
  return { table: 'properties', action: 'soft_deactivate', id: hotelId };
}

/**
 * Upserts a univotel room_type row into CRM room_types.
 */
export async function upsertRoomType(
  crm: SupabaseClient,
  rt: UnivotelRoomType,
): Promise<SyncResult> {
  const { error } = await crm.from('room_types').upsert(
    {
      id: rt.id,
      hotel_id: rt.hotel_id,
      name: rt.name,
      size_m2: rt.size_m2,
      capacity: rt.person_count,
      is_active: true,
    },
    { onConflict: 'id' },
  );

  if (error) throw new Error(`room_types upsert failed: ${error.message}`);
  return { table: 'room_types', action: 'upsert', id: rt.id };
}

/**
 * Soft-deactivates a room type (sync DELETE from univotel).
 */
export async function softDeactivateRoomType(
  crm: SupabaseClient,
  roomTypeId: string,
): Promise<SyncResult> {
  const { error } = await crm.from('room_types').update({ is_active: false }).eq('id', roomTypeId);

  if (error) throw new Error(`room_types soft-deactivate failed: ${error.message}`);
  return { table: 'room_types', action: 'soft_deactivate', id: roomTypeId };
}

/**
 * Handles a single webhook payload from univotel.
 */
export async function handleUnivotelWebhook(
  crm: SupabaseClient,
  payload: UnivotelWebhookPayload,
): Promise<SyncResult> {
  const table = payload.table;

  if (table === 'hotels') {
    if (payload.type === 'DELETE') {
      const id = (payload.old_record?.id as string) ?? '';
      return softDeactivateProperty(crm, id);
    }
    const record = payload.record as unknown as UnivotelHotel;
    return upsertPropertyFromHotel(crm, record);
  }

  if (table === 'room_types') {
    if (payload.type === 'DELETE') {
      const id = (payload.old_record?.id as string) ?? '';
      return softDeactivateRoomType(crm, id);
    }
    const record = payload.record as unknown as UnivotelRoomType;
    return upsertRoomType(crm, record);
  }

  throw new Error(`Unsupported webhook table: ${table}`);
}

/**
 * Full reconciliation: scan univotel hotels + room_types and upsert into CRM.
 */
export async function reconcileFromUnivotel(
  crm: SupabaseClient,
  univotel: SupabaseClient,
): Promise<{ hotels: number; roomTypes: number }> {
  const { data: hotels, error: hotelError } = await univotel
    .from('hotels')
    .select('id, name, address, district, is_visible');

  if (hotelError) throw new Error(`Failed to fetch univotel hotels: ${hotelError.message}`);

  for (const hotel of hotels ?? []) {
    await upsertPropertyFromHotel(crm, hotel as UnivotelHotel);
  }

  const { data: roomTypes, error: rtError } = await univotel
    .from('room_types')
    .select('id, hotel_id, name, size_m2, person_count');

  if (rtError) throw new Error(`Failed to fetch univotel room_types: ${rtError.message}`);

  for (const rt of roomTypes ?? []) {
    await upsertRoomType(crm, rt as UnivotelRoomType);
  }

  return { hotels: hotels?.length ?? 0, roomTypes: roomTypes?.length ?? 0 };
}
