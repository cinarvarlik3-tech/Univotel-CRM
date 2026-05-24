/**
 * Shared Chatwoot API and assignee sync types.
 */

/** Reference to a Chatwoot agent from webhook or API payloads. */
export interface ChatwootAgentRef {
  id?: number;
  name?: string | null;
  email?: string | null;
}

/** Row shape from Chatwoot agents list API. */
export interface ChatwootApiAgent {
  id: number;
  name: string;
  email: string | null;
  role?: string;
}

/** Result of resolving a Chatwoot agent to a CRM salesperson. */
export type ResolveSalespersonResult =
  | { type: 'found'; salespersonId: string; chatwootUserId: number }
  | { type: 'not_found' }
  | { type: 'ambiguous'; reason: string };
