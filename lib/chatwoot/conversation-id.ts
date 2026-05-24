/**
 * Resolves Chatwoot conversation id from lead rows and source_details.
 */

/**
 * Parses conversation id from external_id (conv_{id}_msg_*).
 * @param externalId - source_details.external_id value.
 */
export function parseConversationIdFromExternalId(
  externalId: string | null | undefined,
): number | null {
  if (!externalId) return null;
  const match = /^conv_(\d+)_/.exec(externalId);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

/**
 * Parses conversation id from chatwoot_url path.
 * @param url - Full Chatwoot conversation URL.
 */
export function parseConversationIdFromUrl(url: string | null | undefined): number | null {
  if (!url) return null;
  const match = /\/conversations\/(\d+)/.exec(url);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

/**
 * Resolves conversation id from denormalized column or source_details.
 * @param lead - Lead row subset.
 */
export function resolveChatwootConversationId(lead: {
  chatwoot_conversation_id?: number | null;
  source_details?: unknown;
}): number | null {
  const details =
    lead.source_details &&
    typeof lead.source_details === 'object' &&
    !Array.isArray(lead.source_details)
      ? (lead.source_details as Record<string, unknown>)
      : null;
  if (lead.chatwoot_conversation_id != null) {
    return lead.chatwoot_conversation_id;
  }

  const fromExternal = parseConversationIdFromExternalId(
    typeof details?.external_id === 'string' ? details.external_id : null,
  );
  if (fromExternal != null) return fromExternal;

  return parseConversationIdFromUrl(
    typeof details?.chatwoot_url === 'string' ? details.chatwoot_url : null,
  );
}
