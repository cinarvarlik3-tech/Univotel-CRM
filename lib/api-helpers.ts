/**
 * Shared API response helpers for consistent JSON envelopes.
 */
import type { NextApiResponse } from 'next';
import type { ApiError, ApiSuccess } from '@/types/api';

/**
 * Sends a successful API response with data envelope.
 * @param res - Next.js API response.
 * @param data - Response payload.
 * @param status - HTTP status code (default 200).
 */
export function sendSuccess<T>(res: NextApiResponse, data: T, status = 200): void {
  const body: ApiSuccess<T> = { data };
  res.status(status).json(body);
}

/**
 * Sends an error API response.
 * @param res - Next.js API response.
 * @param error - Error message string.
 * @param status - HTTP status code (default 400).
 * @param fields - Optional field-level validation errors.
 */
export function sendError(
  res: NextApiResponse,
  error: string,
  status = 400,
  fields?: Record<string, string[]>,
): void {
  const body: ApiError = { error, ...(fields ? { fields } : {}) };
  res.status(status).json(body);
}

/**
 * Verifies cron route Bearer token authorization.
 * @param authHeader - Authorization header value.
 * @param secret - Expected CRON_SECRET.
 * @returns True if authorized.
 */
export function verifyCronAuth(authHeader: string | undefined, secret: string): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.slice(7) === secret;
}
