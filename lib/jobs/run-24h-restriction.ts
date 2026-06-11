/**
 * 24h restriction job — flags leads whose WhatsApp customer-service window has
 * closed (no incoming message for 24h) by setting is_24h_restricted = true.
 *
 * This is a single bulk indexed UPDATE driven by the denormalized
 * leads.last_inbound_message_at column (maintained by the Chatwoot webhook on
 * each incoming message). It never scans lead_messages, so cost is independent
 * of message volume. CRM does not push the Chatwoot label — restriction is
 * CRM-internal; the inbound label remains a manual override.
 */
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Restricts active leads whose last incoming message is older than 24 hours.
 * @returns Count of leads newly restricted.
 */
export async function runTwentyFourHourRestriction(): Promise<number> {
  const client = createServiceClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await (
    client as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (
            c: string,
            v: boolean,
          ) => {
            eq: (
              c: string,
              v: boolean,
            ) => {
              eq: (
                c: string,
                v: boolean,
              ) => {
                not: (
                  c: string,
                  op: string,
                  v: null,
                ) => {
                  lt: (
                    c: string,
                    v: string,
                  ) => {
                    select: (c: string) => Promise<{
                      data: Array<{ uuid: string }> | null;
                      error: { message: string } | null;
                    }>;
                  };
                };
              };
            };
          };
        };
      };
    }
  )
    .from('leads')
    .update({ is_24h_restricted: true })
    .eq('is_24h_restricted', false)
    .eq('is_archived', false)
    .eq('is_deleted', false)
    .not('last_inbound_message_at', 'is', null)
    .lt('last_inbound_message_at', cutoff)
    .select('uuid');

  if (error) {
    throw new Error(`Failed to apply 24h restriction: ${error.message}`);
  }

  return data?.length ?? 0;
}
