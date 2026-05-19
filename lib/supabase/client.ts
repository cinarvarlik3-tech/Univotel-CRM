/**
 * Browser Supabase client singleton.
 * Used by React components and hooks for authenticated user queries (RLS enforced).
 */
import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Returns the browser Supabase client, creating it on first call.
 * @returns Supabase browser client with anon key.
 */
export function createBrowserSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
