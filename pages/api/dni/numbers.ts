/**
 * Public DNI numbers endpoint for GTM phone swap tag.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applyCorsHeaders,
  handleCorsPreflight,
  rejectDisallowedOrigin,
} from '@/lib/cors/allowed-origins';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { listActiveDniNumbers } from '@/lib/dni/list-active-numbers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'GET') {
    applyCorsHeaders(req, res);
    return sendError(res, 'Method not allowed', 405);
  }

  if (rejectDisallowedOrigin(req, res)) return;

  try {
    const numbers = await listActiveDniNumbers();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return sendSuccess(res, numbers);
  } catch (err) {
    console.error('[dni/numbers] failed:', err);
    return sendError(res, 'Failed to load DNI numbers', 500);
  }
}
