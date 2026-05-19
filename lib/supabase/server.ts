/**
 * Server Supabase client factory for API routes and SSR.
 * Creates a per-request client with user session from cookies (RLS enforced).
 */
import { createServerClient } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Creates a Supabase server client bound to the request cookies.
 * @param req - Next.js API request with session cookies.
 * @param res - Next.js API response for setting cookies.
 * @returns Supabase server client with anon key and user session.
 */
export function createServerSupabase(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          const serialized = serializeCookie(name, value, options);
          const existing = res.getHeader('Set-Cookie');
          if (!existing) {
            res.setHeader('Set-Cookie', serialized);
          } else if (Array.isArray(existing)) {
            res.setHeader('Set-Cookie', [...existing, serialized]);
          } else {
            res.setHeader('Set-Cookie', [existing as string, serialized]);
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          const serialized = serializeCookie(name, '', { ...options, maxAge: 0 });
          res.setHeader('Set-Cookie', serialized);
        },
      },
    },
  );
}

/**
 * Serializes a cookie for Set-Cookie header.
 * @param name - Cookie name.
 * @param value - Cookie value.
 * @param options - Cookie options from Supabase SSR.
 * @returns Serialized cookie string.
 */
function serializeCookie(
  name: string,
  value: string,
  options: Record<string, unknown>,
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}
