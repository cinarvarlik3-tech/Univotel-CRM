/**
 * Chatwoot Application API client for conversation assignment.
 */
import { env, isChatwootApiConfigured, isChatwootAssigneeSyncEnabled } from '@/lib/env';
import type { ChatwootApiAgent } from '@/lib/chatwoot/types';

/** Chatwoot API error with HTTP status. */
export class ChatwootApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'ChatwootApiError';
  }
}

/**
 * Builds account-scoped API URL.
 * @param path - Path after /api/v1/accounts/{id}/
 */
function accountUrl(path: string): string {
  const base = env.CHATWOOT_BASE_URL.replace(/\/$/, '');
  const accountId = env.CHATWOOT_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('CHATWOOT_ACCOUNT_ID is not configured');
  }
  return `${base}/api/v1/accounts/${accountId}/${path.replace(/^\//, '')}`;
}

/**
 * Performs an authenticated Chatwoot API request.
 * @param path - Account-relative API path.
 * @param init - Fetch init options.
 */
export async function chatwootFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = env.CHATWOOT_API_TOKEN;
  if (!token) {
    throw new Error('CHATWOOT_API_TOKEN is not configured');
  }

  const headers = new Headers(init.headers);
  headers.set('api_access_token', token);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(accountUrl(path), { ...init, headers });
}

/**
 * Lists account agents for directory cache and bootstrap.
 * @returns Chatwoot agent rows.
 */
export async function listChatwootAgents(): Promise<ChatwootApiAgent[]> {
  const res = await chatwootFetch('agents');

  if (!res.ok) {
    const body = await res.text();
    throw new ChatwootApiError(`list agents failed: ${res.status}`, res.status, body);
  }

  const json = (await res.json()) as ChatwootApiAgent[] | { payload?: ChatwootApiAgent[] };
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.payload)) return json.payload;
  return [];
}

/**
 * Assigns or unassigns a conversation in Chatwoot.
 * @param conversationId - Chatwoot conversation id.
 * @param assigneeId - Chatwoot agent user id, or null to clear assignee.
 */
export async function assignChatwootConversation(
  conversationId: number,
  assigneeId: number | null,
): Promise<void> {
  if (!isChatwootAssigneeSyncEnabled()) {
    throw new Error('Chatwoot assignee sync is not enabled');
  }

  const res = await chatwootFetch(`conversations/${conversationId}/assignments`, {
    method: 'POST',
    body: JSON.stringify({ assignee_id: assigneeId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ChatwootApiError(
      `assign conversation ${conversationId} failed: ${res.status}`,
      res.status,
      body,
    );
  }
}

/**
 * Lists labels on a Chatwoot conversation.
 * @param conversationId - Chatwoot conversation id.
 */
export async function listConversationLabels(conversationId: number): Promise<string[]> {
  if (!isChatwootApiConfigured()) {
    throw new Error('Chatwoot API is not configured');
  }

  const res = await chatwootFetch(`conversations/${conversationId}/labels`);

  if (!res.ok) {
    const body = await res.text();
    throw new ChatwootApiError(
      `list labels ${conversationId} failed: ${res.status}`,
      res.status,
      body,
    );
  }

  const json = (await res.json()) as string[] | { payload?: string[] };
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.payload)) return json.payload;
  return [];
}

/**
 * Replaces all labels on a conversation (Chatwoot overwrite semantics).
 * @param conversationId - Chatwoot conversation id.
 * @param labels - Full label slug list to set.
 */
export async function setConversationLabels(
  conversationId: number,
  labels: string[],
): Promise<void> {
  if (!isChatwootApiConfigured()) {
    throw new Error('Chatwoot API is not configured');
  }

  const res = await chatwootFetch(`conversations/${conversationId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ChatwootApiError(
      `set labels ${conversationId} failed: ${res.status}`,
      res.status,
      body,
    );
  }
}
