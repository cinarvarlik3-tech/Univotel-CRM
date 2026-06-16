/**
 * PMS rooms API — GET occupancy grid; POST/PATCH room admin (Operator+).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { requireOperatorWrite } from '@/lib/auth/roles';
import { getRoomsWithOccupancy } from '@/lib/pms/queries';
import { createServiceClient } from '@/lib/supabase/service';

const CreateRoomSchema = z.object({
  room_type_id: z.string().uuid(),
  room_number: z.string().min(1),
  floor: z.number().int(),
  size: z.number().nullable().optional(),
  room_position: z.enum(['corner', 'middle']).nullable().optional(),
});

const UpdateRoomSchema = z.object({
  id: z.string().uuid(),
  room_number: z.string().min(1).optional(),
  floor: z.number().int().optional(),
  size: z.number().nullable().optional(),
  room_position: z.enum(['corner', 'middle']).nullable().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionUser(req, res);
  if (!session) return sendError(res, 'Unauthorized', 401);

  if (req.method === 'GET') {
    const propertyId = req.query.propertyId;
    if (typeof propertyId !== 'string') {
      return sendError(res, 'propertyId is required', 400);
    }

    try {
      const rooms = await getRoomsWithOccupancy(propertyId);
      return sendSuccess(res, rooms);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rooms';
      return sendError(res, message, 500);
    }
  }

  try {
    requireOperatorWrite(session.role);
  } catch {
    return sendError(res, 'Forbidden', 403);
  }

  const client = createServiceClient();

  if (req.method === 'POST') {
    const parsed = CreateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const { data: rt } = await client
      .from('room_types')
      .select('hotel_id, size_m2')
      .eq('id', parsed.data.room_type_id)
      .maybeSingle();

    if (!rt) return sendError(res, 'Room type not found', 404);

    const { data, error } = await client
      .from('rooms')
      .insert({
        property_id: rt.hotel_id,
        room_type_id: parsed.data.room_type_id,
        room_number: parsed.data.room_number,
        floor: parsed.data.floor,
        size: parsed.data.size ?? rt.size_m2,
        room_position: parsed.data.room_position ?? null,
      })
      .select('*')
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, 201);
  }

  if (req.method === 'PATCH') {
    const parsed = UpdateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Invalid input', 400, parsed.error.flatten().fieldErrors);
    }

    const { id, ...updates } = parsed.data;
    const { data, error } = await client
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  }

  return sendError(res, 'Method not allowed', 405);
}
