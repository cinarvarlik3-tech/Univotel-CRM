/**
 * Supabase session refresh middleware — keeps auth cookies in sync for pages and API routes.
 */
import { createServerClient } from '@supabase/ssr';
import type { SerializeOptions } from 'cookie';
import { type NextRequest, NextResponse } from 'next/server';
import {
  readMiddlewareRequestCookies,
  writeMiddlewareResponseCookies,
} from '@/lib/supabase/cookies';

/**
 * Refreshes the Supabase session and forwards updated auth cookies on the response.
 * @param request - Incoming Next.js request.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return readMiddlewareRequestCookies(request);
        },
        setAll(cookiesToSet: { name: string; value: string; options: SerializeOptions }[]) {
          response = NextResponse.next({ request });
          response = writeMiddlewareResponseCookies(response, cookiesToSet);
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
