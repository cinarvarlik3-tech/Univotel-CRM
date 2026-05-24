/**
 * Builds Chatwoot conversation_id → old lead UUID map from imported old_leads rows.
 */

export interface OldLeadConversationSource {
  uuid: string;
  lead_name: string | null;
  chatwoot_conversation_id: number | null;
  source_details: Record<string, unknown> | null;
}

export interface ConversationLeadMap {
  conversationToLead: Map<number, string>;
  leadNames: Map<string, string | null>;
  collisionCount: number;
}

interface ImportMeta {
  merged_conversation_ids?: number[];
}

/**
 * Collects all Chatwoot conversation IDs associated with an old lead row.
 * @param lead - Old lead row from database.
 */
export function collectConversationIdsForLead(lead: OldLeadConversationSource): number[] {
  const ids = new Set<number>();

  if (lead.chatwoot_conversation_id != null) {
    ids.add(lead.chatwoot_conversation_id);
  }

  const meta = lead.source_details?.import_meta as ImportMeta | undefined;
  if (meta && Array.isArray(meta.merged_conversation_ids)) {
    for (const id of meta.merged_conversation_ids) {
      if (typeof id === 'number' && Number.isFinite(id)) {
        ids.add(id);
      }
    }
  }

  return [...ids];
}

/**
 * Builds conversation_id → lead_uuid map for message ETL.
 * @param leads - All old_leads rows from Supabase.
 */
export function buildConversationLeadMap(leads: OldLeadConversationSource[]): ConversationLeadMap {
  const conversationToLead = new Map<number, string>();
  const leadNames = new Map<string, string | null>();
  let collisionCount = 0;

  for (const lead of leads) {
    leadNames.set(lead.uuid, lead.lead_name);

    for (const conversationId of collectConversationIdsForLead(lead)) {
      const existing = conversationToLead.get(conversationId);
      if (existing != null && existing !== lead.uuid) {
        collisionCount++;
        continue;
      }
      conversationToLead.set(conversationId, lead.uuid);
    }
  }

  return { conversationToLead, leadNames, collisionCount };
}
