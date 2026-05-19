/**
 * Service role Supabase client for webhooks and background jobs.
 * Bypasses RLS — must only be imported from allowlisted modules.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from '@/lib/env';

/**
 * Creates a Supabase client with service role key (bypasses RLS).
 * @returns Supabase service role client.
 */
export function createServiceClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
