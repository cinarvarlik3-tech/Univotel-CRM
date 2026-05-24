/**
 * Public REF generation endpoint for GTM on marketing sites.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applyCorsHeaders,
  handleCorsPreflight,
  rejectDisallowedOrigin,
} from '@/lib/cors/allowed-origins';
import { sendError, sendSuccess } from '@/lib/api-helpers';
import { createRefSession, parseRefSessionQuery } from '@/lib/ref/create-ref-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'GET') {
    applyCorsHeaders(req, res);
    return sendError(res, 'Method not allowed', 405);
  }

  if (rejectDisallowedOrigin(req, res)) return;

  try {
    const input = parseRefSessionQuery(req.query);
    const session = await createRefSession(input);
    return sendSuccess(res, { ref: session.ref_code });
  } catch (err) {
    console.error('[ref/generate] failed:', err);
    return sendError(res, 'Failed to generate REF', 500);
  }
}
