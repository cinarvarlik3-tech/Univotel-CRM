/**
 * Cookie helpers for Supabase SSR on Next.js API routes and middleware.
 */
import { parse, serialize, type SerializeOptions } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';

/** Cookie name/value pair used by Supabase SSR. */
export interface RequestCookie {
  name: string;
  value: string;
}

/**
 * Reads all cookies from a Pages API request, falling back to the raw Cookie header.
 * Cloudflare Workers sometimes omit parsed req.cookies even when the header is present.
 * @param req - Next.js API request.
 */
export function readApiRequestCookies(req: NextApiRequest): RequestCookie[] {
  const parsed = req.cookies ?? {};
  const fromParser = Object.entries(parsed)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([name, value]) => ({ name, value }));

  if (fromParser.length > 0) {
    return fromParser;
  }

  const raw = req.headers.cookie;
  if (!raw) return [];

  return Object.entries(parse(raw)).map(([name, value]) => ({
    name,
    value: value ?? '',
  }));
}

/**
 * Appends Set-Cookie headers to a Pages API response.
 * @param res - Next.js API response.
 * @param cookiesToSet - Cookies Supabase wants to persist.
 */
export function writeApiResponseCookies(
  res: NextApiResponse,
  cookiesToSet: { name: string; value: string; options: SerializeOptions }[],
): void {
  if (cookiesToSet.length === 0) return;

  const existing = res.getHeader('Set-Cookie');
  const headers = Array.isArray(existing) ? [...existing] : existing ? [String(existing)] : [];

  for (const { name, value, options } of cookiesToSet) {
    headers.push(serialize(name, value, options));
  }

  res.setHeader('Set-Cookie', headers);
}

/**
 * Reads all cookies from a Next.js middleware request.
 * @param request - Next.js middleware request.
 */
export function readMiddlewareRequestCookies(request: NextRequest): RequestCookie[] {
  return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
}

/**
 * Writes cookies onto a middleware response, preserving prior Set-Cookie values.
 * @param response - Current middleware response (usually NextResponse.next()).
 * @param cookiesToSet - Cookies Supabase wants to persist.
 */
export function writeMiddlewareResponseCookies(
  response: NextResponse,
  cookiesToSet: { name: string; value: string; options: SerializeOptions }[],
): NextResponse {
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }

  return response;
}
