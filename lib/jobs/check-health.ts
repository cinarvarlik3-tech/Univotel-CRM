/**
 * Database health check job logic.
 */
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Verifies Supabase database connectivity.
 * @returns True if database is reachable.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  const client = createServiceClient();
  const { error } = await client.from('salespeople').select('id').limit(1);
  return !error;
}
