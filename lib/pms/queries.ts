/**
 * Read-only PMS queries — occupancy, unplaced worklist, active placements.
 * All occupancy uses vacated_at IS NULL as the canonical active predicate.
 */
import { createServiceClient } from '@/lib/supabase/service';

/** Active occupant on a room card. */
export interface PmsRoomOccupant {
  leadRoomId: string;
  leadUuid: string;
  leadName: string | null;
  studentGender: string | null;
  moveIn: string | null;
  actualMoveIn: string | null;
}

/** Room with computed occupancy for the rooms grid. */
export interface PmsRoomWithOccupancy {
  id: string;
  propertyId: string;
  roomNumber: string;
  floor: number;
  roomPosition: string | null;
  size: number | null;
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  occupantCount: number;
  isFull: boolean;
  occupants: PmsRoomOccupant[];
}

/** Unplaced lead row for the worklist panel. */
export interface PmsUnplacedLead {
  leadUuid: string;
  leadName: string | null;
  funnelStatus: string;
  studentGender: string | null;
  schoolShortname: string | null;
  purchasedRoomTypeId: string;
  purchasedRoomTypeName: string;
  purchasedPropertyId: string;
  purchasedPropertyName: string;
  placementNote: string | null;
}

/** Active placement summary for a lead. */
export interface PmsActivePlacement {
  leadRoomId: string;
  roomId: string;
  roomNumber: string;
  propertyId: string;
  propertyName: string;
  roomTypeName: string;
}

/**
 * Returns rooms for a property with computed occupancy and occupant details.
 */
export async function getRoomsWithOccupancy(propertyId: string): Promise<PmsRoomWithOccupancy[]> {
  const client = createServiceClient();

  const { data: rooms, error } = await client
    .from('rooms')
    .select(
      'id, property_id, room_number, floor, room_position, size, room_type_id, room_types!inner(id, name, capacity)',
    )
    .eq('property_id', propertyId)
    .order('floor', { ascending: true })
    .order('room_number', { ascending: true });

  if (error) throw new Error(`Failed to fetch rooms: ${error.message}`);
  if (!rooms || rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id as string);

  const { data: placements, error: placementError } = await client
    .from('lead_rooms')
    .select(
      'id, room_id, lead_id, leads!inner(uuid, lead_name, lead_details(move_in, actual_move_in_date, student_gender))',
    )
    .in('room_id', roomIds)
    .is('vacated_at', null);

  if (placementError) throw new Error(`Failed to fetch placements: ${placementError.message}`);

  const byRoom = new Map<string, PmsRoomOccupant[]>();
  for (const p of placements ?? []) {
    const row = p as Record<string, unknown>;
    const roomId = row.room_id as string;
    const leads = row.leads as {
      uuid: string;
      lead_name: string | null;
      lead_details: {
        move_in: string | null;
        actual_move_in_date: string | null;
        student_gender: string | null;
      } | null;
    } | null;
    const details = leads?.lead_details ?? null;
    const list = byRoom.get(roomId) ?? [];
    list.push({
      leadRoomId: row.id as string,
      leadUuid: leads?.uuid ?? (row.lead_id as string),
      leadName: leads?.lead_name ?? null,
      studentGender: details?.student_gender ?? null,
      moveIn: details?.move_in ?? null,
      actualMoveIn: details?.actual_move_in_date ?? null,
    });
    byRoom.set(roomId, list);
  }

  return rooms.map((r) => {
    const row = r as Record<string, unknown>;
    const rt = row.room_types as { id: string; name: string; capacity: number };
    const occupants = byRoom.get(row.id as string) ?? [];
    const occupantCount = occupants.length;
    const capacity = rt.capacity;
    return {
      id: row.id as string,
      propertyId: row.property_id as string,
      roomNumber: row.room_number as string,
      floor: row.floor as number,
      roomPosition: (row.room_position as string | null) ?? null,
      size: row.size != null ? Number(row.size) : null,
      roomTypeId: rt.id,
      roomTypeName: rt.name,
      capacity,
      occupantCount,
      isFull: occupantCount >= capacity,
      occupants,
    };
  });
}

/**
 * Returns leads with purchased_room set and no active placement.
 */
export async function getUnplacedLeads(opts?: {
  propertyId?: string;
  studentGender?: string;
  schoolShortname?: string;
}): Promise<PmsUnplacedLead[]> {
  const client = createServiceClient();

  const { data: activePlacements, error: activeError } = await client
    .from('lead_rooms')
    .select('lead_id')
    .is('vacated_at', null);

  if (activeError) throw new Error(`Failed to fetch active placements: ${activeError.message}`);

  const placedLeadIds = new Set((activePlacements ?? []).map((p) => p.lead_id as string));

  let query = client
    .from('lead_details')
    .select(
      'lead_uuid, purchased_room, placement_note, student_gender, school_shortname, leads!inner(uuid, lead_name, funnel_status), room_types!inner(id, name, hotel_id, properties!inner(id, hotel_name))',
    )
    .not('purchased_room', 'is', null);

  if (opts?.studentGender) {
    query = query.eq('student_gender', opts.studentGender);
  }
  if (opts?.schoolShortname) {
    query = query.eq('school_shortname', opts.schoolShortname);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch unplaced leads: ${error.message}`);

  const results: PmsUnplacedLead[] = [];

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const leadUuid = r.lead_uuid as string;
    if (placedLeadIds.has(leadUuid)) continue;

    const leads = r.leads as { uuid: string; lead_name: string | null; funnel_status: string };
    const rt = r.room_types as {
      id: string;
      name: string;
      hotel_id: string;
      properties: { id: string; hotel_name: string };
    };

    if (opts?.propertyId && rt.properties.id !== opts.propertyId) continue;

    results.push({
      leadUuid,
      leadName: leads.lead_name,
      funnelStatus: leads.funnel_status,
      studentGender: (r.student_gender as string | null) ?? null,
      schoolShortname: (r.school_shortname as string | null) ?? null,
      purchasedRoomTypeId: rt.id,
      purchasedRoomTypeName: rt.name,
      purchasedPropertyId: rt.properties.id,
      purchasedPropertyName: rt.properties.hotel_name,
      placementNote: (r.placement_note as string | null) ?? null,
    });
  }

  results.sort((a, b) => {
    const fs = a.funnelStatus.localeCompare(b.funnelStatus);
    if (fs !== 0) return fs;
    return (a.leadName ?? '').localeCompare(b.leadName ?? '');
  });

  return results;
}

/**
 * Returns true when the lead has an active room placement.
 */
export async function isLeadPlaced(leadUuid: string): Promise<boolean> {
  const client = createServiceClient();
  const { count, error } = await client
    .from('lead_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadUuid)
    .is('vacated_at', null);

  if (error) throw new Error(`Failed to check placement: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * Returns the active placement for a lead, if any.
 */
export async function getActivePlacement(leadUuid: string): Promise<PmsActivePlacement | null> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('lead_rooms')
    .select(
      'id, room_id, rooms!inner(id, room_number, property_id, room_types!inner(name), properties!inner(hotel_name))',
    )
    .eq('lead_id', leadUuid)
    .is('vacated_at', null)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch active placement: ${error.message}`);
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const room = row.rooms as {
    id: string;
    room_number: string;
    property_id: string;
    room_types: { name: string };
    properties: { hotel_name: string };
  };

  return {
    leadRoomId: row.id as string,
    roomId: room.id,
    roomNumber: room.room_number,
    propertyId: room.property_id,
    propertyName: room.properties.hotel_name,
    roomTypeName: room.room_types.name,
  };
}
