/**
 * Server Supabase client factory for API routes and SSR.
 * Creates a per-request client with user session from cookies (RLS enforced).
 */
import { createServerClient } from '@supabase/ssr';
import type { SerializeOptions } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import { readApiRequestCookies, writeApiResponseCookies } from '@/lib/supabase/cookies';

/**
 * Creates a Supabase server client bound to the request cookies.
 * Uses getAll/setAll so chunked auth cookies are read and refreshed correctly.
 * @param req - Next.js API request with session cookies.
 * @param res - Next.js API response for setting refreshed cookies.
 * @returns Supabase server client with anon key and user session.
 */
export function createServerSupabase(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return readApiRequestCookies(req);
        },
        setAll(cookiesToSet: { name: string; value: string; options: SerializeOptions }[]) {
          writeApiResponseCookies(res, cookiesToSet);
        },
      },
    },
  );
}
