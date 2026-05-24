/**
 * CORS configuration for public Phase 4 endpoints called from marketing sites.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

/** Origins allowed to call /api/ref/generate and /api/dni/numbers. */
export const ALLOWED_ORIGINS = [
  'https://univotel.com',
  'https://www.univotel.com',
  'https://ituyurt.com',
  'https://galatasarayyurt.com',
  'https://kampushan.com',
  'https://academic-house.com',
] as const;

/**
 * Resolves the request Origin header when it is on the allow list.
 * @param req - Incoming API request.
 * @returns Allowed origin string or null.
 */
export function getAllowedOrigin(req: NextApiRequest): string | null {
  const origin = req.headers.origin;
  if (!origin || typeof origin !== 'string') return null;
  return (ALLOWED_ORIGINS as readonly string[]).includes(origin) ? origin : null;
}

/**
 * Applies CORS headers for an allowed browser origin.
 * @param req - Incoming API request.
 * @param res - API response to mutate.
 * @returns True when origin is allowed.
 */
export function applyCorsHeaders(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = getAllowedOrigin(req);
  if (!origin) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  return true;
}

/**
 * Handles CORS preflight OPTIONS requests for public endpoints.
 * @param req - Incoming API request.
 * @param res - API response.
 * @returns True when OPTIONS was handled (caller should return early).
 */
export function handleCorsPreflight(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method !== 'OPTIONS') return false;

  if (!applyCorsHeaders(req, res)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return true;
  }

  res.status(204).end();
  return true;
}

/**
 * Rejects disallowed cross-origin requests with 403.
 * @param req - Incoming API request.
 * @param res - API response.
 * @returns True when request was rejected.
 */
export function rejectDisallowedOrigin(req: NextApiRequest, res: NextApiResponse): boolean {
  if (!req.headers.origin) return false;
  if (applyCorsHeaders(req, res)) return false;
  res.status(403).json({ error: 'Origin not allowed' });
  return true;
}
