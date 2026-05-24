/**
 * Cached Chatwoot agent directory for outbound assignee resolution.
 */
import { listChatwootAgents } from '@/lib/chatwoot/client';
import { normalizeDisplayName, normalizeEmail } from '@/lib/chatwoot/normalize';
import type { ChatwootApiAgent } from '@/lib/chatwoot/types';

const CACHE_TTL_MS = 15 * 60 * 1000;

let cachedAgents: ChatwootApiAgent[] | null = null;
let cachedAt = 0;

/**
 * Returns Chatwoot agents, refreshing cache when stale.
 */
export async function getChatwootAgentDirectory(): Promise<ChatwootApiAgent[]> {
  const now = Date.now();
  if (cachedAgents && now - cachedAt < CACHE_TTL_MS) {
    return cachedAgents;
  }

  cachedAgents = await listChatwootAgents();
  cachedAt = now;
  return cachedAgents;
}

/**
 * Clears in-memory agent cache (for tests).
 */
export function clearChatwootAgentDirectoryCache(): void {
  cachedAgents = null;
  cachedAt = 0;
}

/**
 * Finds Chatwoot agent id by normalized email in directory.
 * @param email - Agent email.
 */
export async function findChatwootAgentIdByEmail(email: string): Promise<number | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const agents = await getChatwootAgentDirectory();
  const matches = agents.filter((a) => normalizeEmail(a.email) === normalized);
  return matches.length === 1 ? matches[0].id : null;
}

/**
 * Finds Chatwoot agent id by normalized display name in directory.
 * @param name - Agent display name.
 */
export async function findChatwootAgentIdByName(name: string): Promise<number | null> {
  const normalized = normalizeDisplayName(name);
  if (!normalized) return null;

  const agents = await getChatwootAgentDirectory();
  const matches = agents.filter((a) => normalizeDisplayName(a.name) === normalized);
  return matches.length === 1 ? matches[0].id : null;
}
