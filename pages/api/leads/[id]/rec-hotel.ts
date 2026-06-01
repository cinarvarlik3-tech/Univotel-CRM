/**
 * PATCH endpoint for Make.com to write hotel recommendation results to lead_details.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendError, sendSuccess, verifyCronAuth } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { env } from '@/lib/env';
import { saveLeadRecHotel } from '@/lib/leads/save-rec-hotel';

const RecHotelSchema = z.object({
  recommendations: z
    .array(
      z.object({
        property_id: z.string().uuid(),
        hotel_name: z.string(),
        district: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .min(1)
    .max(3),
});

/**
 * Allows Make.com bearer token or authenticated CRM session.
 * @param req - Incoming API request.
 * @param res - API response for session cookie handling.
 * @returns True when the caller is authorized.
 */
async function isAuthorized(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  if (verifyCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return true;
  }

  const session = await getSessionUser(req, res);
  return session !== null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return sendError(res, 'Method not allowed', 405);
  }

  if (!(await isAuthorized(req, res))) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return sendError(res, 'Invalid lead ID', 400);
  }

  const parsed = RecHotelSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
  }

  const result = await saveLeadRecHotel(id, parsed.data.recommendations);

  if (result === 'not_found') {
    return sendError(res, 'Lead not found', 404);
  }

  if (result === 'error') {
    return sendError(res, 'Failed to save recommendation', 500);
  }

  return sendSuccess(res, { success: true });
}
