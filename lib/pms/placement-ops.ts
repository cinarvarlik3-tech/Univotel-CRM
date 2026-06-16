/**
 * PMS placement write operations — place, vacate, relocate, change room type.
 * Uses service client; authorization enforced by calling API handlers.
 */
import { createServiceClient } from '@/lib/supabase/service';
import { mapPlacementTriggerError } from '@/lib/pms/trigger-errors';

export type VacateReason = 'removed' | 'lost' | 'relocated' | 'type_changed';

/** Thrown when a placement write fails due to trigger or DB constraint. */
export class PmsPlacementError extends Error {
  constructor(
    message: string,
    public readonly code: 'TYPE_MISMATCH' | 'ROOM_AT_CAPACITY' | 'UNKNOWN',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PmsPlacementError';
  }
}

function wrapPlacementError(err: unknown): never {
  const mapped = mapPlacementTriggerError(err);
  throw new PmsPlacementError(mapped.message, mapped.code, mapped.status);
}

/**
 * Inserts an active lead_rooms row (place lead in room).
 */
export async function placeLead(opts: {
  leadId: string;
  roomId: string;
  placedBy: string;
}): Promise<{ id: string }> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('lead_rooms')
    .insert({
      lead_id: opts.leadId,
      room_id: opts.roomId,
      placed_by: opts.placedBy,
    })
    .select('id')
    .single();

  if (error) wrapPlacementError(error);
  return { id: data!.id as string };
}

/**
 * Soft-vacates an active placement row.
 */
export async function vacatePlacement(opts: {
  leadRoomId: string;
  reason: VacateReason;
  vacatedBy: string;
}): Promise<void> {
  const client = createServiceClient();

  const { error } = await client
    .from('lead_rooms')
    .update({
      vacated_at: new Date().toISOString(),
      vacated_by: opts.vacatedBy,
      vacate_reason: opts.reason,
    })
    .eq('id', opts.leadRoomId)
    .is('vacated_at', null);

  if (error) wrapPlacementError(error);
}

/**
 * Vacates active placement for a lead by lead UUID (e.g. on loss).
 */
export async function vacateActivePlacementForLead(opts: {
  leadId: string;
  reason: VacateReason;
  vacatedBy: string | null;
}): Promise<void> {
  const client = createServiceClient();

  const { error } = await client
    .from('lead_rooms')
    .update({
      vacated_at: new Date().toISOString(),
      vacated_by: opts.vacatedBy,
      vacate_reason: opts.reason,
    })
    .eq('lead_id', opts.leadId)
    .is('vacated_at', null);

  if (error) wrapPlacementError(error);
}

/**
 * Relocate: vacate current active row + insert new active row (same purchased type).
 */
export async function relocateLead(opts: {
  leadId: string;
  toRoomId: string;
  operatorId: string;
}): Promise<{ id: string }> {
  const client = createServiceClient();

  const { data: active, error: fetchError } = await client
    .from('lead_rooms')
    .select('id')
    .eq('lead_id', opts.leadId)
    .is('vacated_at', null)
    .maybeSingle();

  if (fetchError) wrapPlacementError(fetchError);
  if (!active) throw new PmsPlacementError('Aktif yerleştirme bulunamadı', 'UNKNOWN', 404);

  const { error: vacateError } = await client
    .from('lead_rooms')
    .update({
      vacated_at: new Date().toISOString(),
      vacated_by: opts.operatorId,
      vacate_reason: 'relocated',
    })
    .eq('id', active.id);

  if (vacateError) wrapPlacementError(vacateError);

  return placeLead({
    leadId: opts.leadId,
    roomId: opts.toRoomId,
    placedBy: opts.operatorId,
  });
}

/**
 * Change room/property: update purchased_room; optionally place in new room.
 * If toRoomId omitted, lead returns to unplaced list.
 */
export async function changeRoomType(opts: {
  leadId: string;
  newTypeId: string;
  toRoomId?: string;
  operatorId: string;
}): Promise<{ placed: boolean; leadRoomId?: string }> {
  const client = createServiceClient();

  const { error: detailError } = await client
    .from('lead_details')
    .update({ purchased_room: opts.newTypeId })
    .eq('lead_uuid', opts.leadId);

  if (detailError) wrapPlacementError(detailError);

  const { data: active } = await client
    .from('lead_rooms')
    .select('id')
    .eq('lead_id', opts.leadId)
    .is('vacated_at', null)
    .maybeSingle();

  if (active) {
    const { error: vacateError } = await client
      .from('lead_rooms')
      .update({
        vacated_at: new Date().toISOString(),
        vacated_by: opts.operatorId,
        vacate_reason: 'type_changed',
      })
      .eq('id', active.id);

    if (vacateError) wrapPlacementError(vacateError);
  }

  if (!opts.toRoomId) {
    return { placed: false };
  }

  const placed = await placeLead({
    leadId: opts.leadId,
    roomId: opts.toRoomId,
    placedBy: opts.operatorId,
  });

  return { placed: true, leadRoomId: placed.id };
}

/**
 * Updates placement_note on lead_details.
 */
export async function updatePlacementNote(opts: {
  leadId: string;
  note: string | null;
}): Promise<void> {
  const client = createServiceClient();

  const { error } = await client
    .from('lead_details')
    .update({ placement_note: opts.note })
    .eq('lead_uuid', opts.leadId);

  if (error) throw new Error(`Failed to update placement note: ${error.message}`);
}
