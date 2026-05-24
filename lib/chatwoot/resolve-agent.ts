/**
 * Resolves Chatwoot agents to CRM salespeople and vice versa.
 */
import {
  findChatwootAgentIdByEmail,
  findChatwootAgentIdByName,
} from '@/lib/chatwoot/agent-directory';
import { normalizeDisplayName, normalizeEmail } from '@/lib/chatwoot/normalize';
import type { ChatwootAgentRef, ResolveSalespersonResult } from '@/lib/chatwoot/types';
import { createServiceClient } from '@/lib/supabase/service';

interface SalespersonRow {
  id: string;
  full_name: string;
  email: string;
  chatwoot_user_id: number | null;
}

/**
 * Resolves inbound Chatwoot assignee to a CRM salesperson UUID.
 * @param agent - Chatwoot assignee reference from webhook.
 */
export async function resolveSalespersonFromChatwoot(
  agent: ChatwootAgentRef | null | undefined,
): Promise<ResolveSalespersonResult> {
  if (!agent) return { type: 'not_found' };

  const client = createServiceClient();

  if (agent.id != null) {
    const { data, error } = await client
      .from('salespeople')
      .select('id, full_name, email, chatwoot_user_id')
      .eq('chatwoot_user_id', agent.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`salespeople lookup by chatwoot_user_id failed: ${error.message}`);
    }

    if (data) {
      return { type: 'found', salespersonId: data.id, chatwootUserId: agent.id };
    }
  }

  const email = normalizeEmail(agent.email);
  if (email) {
    const { data: rows, error } = await client
      .from('salespeople')
      .select('id, full_name, email, chatwoot_user_id')
      .ilike('email', email)
      .eq('is_active', true);

    if (error) {
      throw new Error(`salespeople lookup by email failed: ${error.message}`);
    }

    const matches = (rows ?? []) as SalespersonRow[];
    if (matches.length === 1) {
      const chatwootUserId = agent.id ?? matches[0].chatwoot_user_id;
      if (chatwootUserId == null) {
        return { type: 'not_found' };
      }
      return { type: 'found', salespersonId: matches[0].id, chatwootUserId };
    }
    if (matches.length > 1) {
      return { type: 'ambiguous', reason: `multiple salespeople for email ${email}` };
    }
  }

  const name = normalizeDisplayName(agent.name);
  if (name) {
    const { data: rows, error } = await client
      .from('salespeople')
      .select('id, full_name, email, chatwoot_user_id')
      .eq('is_active', true);

    if (error) {
      throw new Error(`salespeople lookup by name failed: ${error.message}`);
    }

    const matches = ((rows ?? []) as SalespersonRow[]).filter(
      (row) => normalizeDisplayName(row.full_name) === name,
    );

    if (matches.length === 1) {
      const chatwootUserId = agent.id ?? matches[0].chatwoot_user_id;
      if (chatwootUserId == null) {
        return { type: 'not_found' };
      }
      return { type: 'found', salespersonId: matches[0].id, chatwootUserId };
    }
    if (matches.length > 1) {
      return { type: 'ambiguous', reason: `multiple salespeople for name ${name}` };
    }
  }

  return { type: 'not_found' };
}

/**
 * Resolves CRM salesperson to Chatwoot assignee id for outbound API calls.
 * @param salespersonId - CRM salespeople.id UUID.
 */
export async function resolveChatwootAgentFromSalesperson(
  salespersonId: string,
): Promise<number | null> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('salespeople')
    .select('id, full_name, email, chatwoot_user_id')
    .eq('id', salespersonId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`salesperson lookup failed: ${error?.message ?? 'not found'}`);
  }

  const row = data as SalespersonRow;
  if (row.chatwoot_user_id != null) {
    return row.chatwoot_user_id;
  }

  const byEmail = row.email ? await findChatwootAgentIdByEmail(row.email) : null;
  if (byEmail != null) return byEmail;

  return findChatwootAgentIdByName(row.full_name);
}

/**
 * Persists discovered chatwoot_user_id on salespeople when resolved via email/name.
 * @param salespersonId - CRM UUID.
 * @param chatwootUserId - Chatwoot agent id.
 */
export async function persistChatwootUserIdMapping(
  salespersonId: string,
  chatwootUserId: number,
): Promise<void> {
  const client = createServiceClient();
  await client
    .from('salespeople')
    .update({ chatwoot_user_id: chatwootUserId })
    .eq('id', salespersonId)
    .is('chatwoot_user_id', null);
}
