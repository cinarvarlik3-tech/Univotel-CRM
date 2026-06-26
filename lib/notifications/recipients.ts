/**
 * Recipient resolution for the notification pipeline.
 * Each resolver returns a deduplicated array of Telegram chat IDs, skipping nulls.
 * This is the ONLY place audience logic lives — callers never construct chat ID sets
 * themselves.
 *
 * partner_operator exclusion rule: partner_operators are NEVER included in any
 * broadcast resolver (allStaff, managersAndAbove, superadminsOnly). The ONLY path
 * through which a partner_operator can receive a notification is propertyResponsible().
 */
import { createServiceClient } from '@/lib/supabase/service';

function dedupe(ids: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/** Chat IDs for the lead's assigned salesperson. Empty when unassigned. */
export async function assigneeOnly(leadId: string): Promise<string[]> {
  const client = createServiceClient();

  const { data: lead } = await client
    .from('leads')
    .select('assigned_to')
    .eq('uuid', leadId)
    .maybeSingle();

  if (!lead?.assigned_to) return [];

  const { data: sp } = await client
    .from('salespeople')
    .select('telegram_chat_id')
    .eq('id', lead.assigned_to)
    .eq('is_active', true)
    .maybeSingle();

  return dedupe([sp?.telegram_chat_id]);
}

/**
 * Chat IDs for all active staff.
 * Excludes partner_operator — this is a hard guard.
 */
export async function allStaff(): Promise<string[]> {
  const client = createServiceClient();

  const { data } = await client
    .from('salespeople')
    .select('telegram_chat_id')
    .eq('is_active', true)
    .in('role', ['salesperson', 'operator', 'manager', 'superadmin'])
    .not('telegram_chat_id', 'is', null);

  return dedupe((data ?? []).map((r) => r.telegram_chat_id));
}

/** Chat IDs for active managers and superadmins. */
export async function managersAndAbove(): Promise<string[]> {
  const client = createServiceClient();

  const { data } = await client
    .from('salespeople')
    .select('telegram_chat_id')
    .eq('is_active', true)
    .in('role', ['manager', 'superadmin'])
    .not('telegram_chat_id', 'is', null);

  return dedupe((data ?? []).map((r) => r.telegram_chat_id));
}

/** Chat IDs for active superadmins only. */
export async function superadminsOnly(): Promise<string[]> {
  const client = createServiceClient();

  const { data } = await client
    .from('salespeople')
    .select('telegram_chat_id')
    .eq('is_active', true)
    .eq('role', 'superadmin')
    .not('telegram_chat_id', 'is', null);

  return dedupe((data ?? []).map((r) => r.telegram_chat_id));
}

/**
 * Chat IDs for all active staff whose home_property_id matches.
 * Includes ALL roles — this is the only path for partner_operator notifications.
 * Returns empty array when no one is responsible for the property.
 */
export async function propertyResponsible(propertyId: string): Promise<string[]> {
  const client = createServiceClient();

  const { data } = await client
    .from('salespeople')
    .select('telegram_chat_id')
    .eq('is_active', true)
    .eq('home_property_id', propertyId)
    .not('telegram_chat_id', 'is', null);

  return dedupe((data ?? []).map((r) => r.telegram_chat_id));
}

/**
 * Recipients for visit-type notifications.
 * = managersAndAbove ∪ propertyResponsible ∪ (broadcast allStaff if responsible empty)
 * For visit_reminder: also includes assigneeOnly(leadId).
 */
export async function visitRecipients(opts: {
  propertyId: string;
  leadId?: string;
}): Promise<string[]> {
  const [managers, responsible, assignee] = await Promise.all([
    managersAndAbove(),
    propertyResponsible(opts.propertyId),
    opts.leadId ? assigneeOnly(opts.leadId) : Promise.resolve([] as string[]),
  ]);

  const base = dedupe([...managers, ...responsible, ...assignee]);

  if (responsible.length === 0) {
    const staff = await allStaff();
    return dedupe([...base, ...staff]);
  }

  return base;
}
