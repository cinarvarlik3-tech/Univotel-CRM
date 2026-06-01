/**
 * Builds old_leads + old_lead_details rows from parsed Chatwoot dump data.
 */
import { randomUUID } from 'crypto';
import { TURKISH_UNIVERSITIES } from '@/data/turkish-universities';
import {
  buildUniversityLookup,
  extractUniversityFromMessages,
} from '@/lib/import/extract-university';
import { extractGenderFromMessages } from '@/lib/import/extract-gender';
import type {
  BuildOldLeadsResult,
  BuiltOldLeadRow,
  ChatwootConversationRow,
  ChatwootDumpData,
  SkippedConversation,
} from '@/lib/import/types';
import { normalizeInstagramHandle } from '@/lib/leads/normalize-instagram-handle';
import { normalizePhone } from '@/lib/leads/normalize-phone';
import { buildChatwootSourceDetails } from '@/lib/leads/source-details';

interface ConversationRef {
  conversation: ChatwootConversationRow;
  contactId: number;
}

interface IdentifierGroup {
  key: string;
  kind: 'phone' | 'instagram';
  conversations: ConversationRef[];
  normalizationFailed: boolean;
  rawPhone: string | null;
}

const UNIVERSITY_LOOKUP = buildUniversityLookup(TURKISH_UNIVERSITIES);

/**
 * Maps Chatwoot inbox channel_type to CRM channel enums.
 * @param channelType - Raw inbox channel_type from dump.
 */
export function mapInboxChannel(
  channelType: string,
): { leadSource: 'whatsapp' | 'instagram'; messageFrom: 'whatsapp' | 'instagram' } | null {
  if (channelType === 'Channel::Whatsapp') {
    return { leadSource: 'whatsapp', messageFrom: 'whatsapp' };
  }
  if (channelType === 'Channel::Instagram') {
    return { leadSource: 'instagram', messageFrom: 'instagram' };
  }
  return null;
}

/**
 * Resolves lead_phone key for a conversation contact.
 * Phone takes precedence over Instagram handle.
 */
function resolveIdentifier(
  dump: ChatwootDumpData,
  contactId: number,
): Omit<IdentifierGroup, 'conversations'> | null {
  const contact = dump.contacts.get(contactId);
  if (!contact) return null;

  const rawPhone = contact.phone_number?.trim() ?? '';
  if (rawPhone.length > 0) {
    const normalized = normalizePhone(rawPhone);
    return {
      key: normalized.phone,
      kind: 'phone',
      normalizationFailed: normalized.failed,
      rawPhone: normalized.failed ? rawPhone : null,
    };
  }

  const attrs = contact.additional_attributes ?? {};
  const rawHandle =
    (typeof attrs.social_instagram_user_name === 'string'
      ? attrs.social_instagram_user_name
      : null) ??
    contact.identifier ??
    '';

  const handleResult = normalizeInstagramHandle(rawHandle);
  if (!handleResult.failed) {
    return {
      key: handleResult.handle,
      kind: 'instagram',
      normalizationFailed: false,
      rawPhone: null,
    };
  }

  return null;
}

function pickPrimaryConversation(refs: ConversationRef[]): ConversationRef {
  return refs.reduce((best, current) => {
    const bestUpdated = best.conversation.updated_at;
    const currentUpdated = current.conversation.updated_at;
    if (currentUpdated > bestUpdated) return current;
    if (currentUpdated < bestUpdated) return best;
    return current.conversation.id > best.conversation.id ? current : best;
  });
}

function firstInboundMessageId(dump: ChatwootDumpData, conversationId: number): number | null {
  const messages = dump.messagesByConversation.get(conversationId) ?? [];
  const inbound = messages.find((m) => m.message_type === 0);
  return inbound?.id ?? null;
}

function lastContactAt(dump: ChatwootDumpData, primary: ChatwootConversationRow): string | null {
  const messages = dump.messagesByConversation.get(primary.id) ?? [];
  const timestamps = [
    primary.updated_at,
    primary.contact_last_seen_at,
    ...messages.map((m) => m.created_at),
  ].filter((v): v is string => Boolean(v));

  if (timestamps.length === 0) return null;
  return timestamps.reduce((max, ts) => (ts > max ? ts : max));
}

function buildChatwootUrl(baseUrl: string, accountId: number, conversationId: number): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  return `${trimmed}/app/accounts/${accountId}/conversations/${conversationId}`;
}

function inboundMessageContents(dump: ChatwootDumpData, conversationId: number): string[] {
  return (dump.messagesByConversation.get(conversationId) ?? [])
    .filter((m) => m.message_type === 0 && m.content && m.content.trim().length > 0)
    .map((m) => m.content as string);
}

function buildRowForGroup(
  dump: ChatwootDumpData,
  group: IdentifierGroup,
  chatwootBaseUrl: string,
): BuiltOldLeadRow {
  const primaryRef = pickPrimaryConversation(group.conversations);
  const primary = primaryRef.conversation;
  const contact = dump.contacts.get(primary.contact_id);
  const inbox = dump.inboxes.get(primary.inbox_id);
  const channel = mapInboxChannel(inbox?.channel_type ?? '');

  if (!channel) {
    throw new Error(`Unsupported inbox channel for conversation ${primary.id}`);
  }

  const mergedIds = group.conversations
    .map((r) => r.conversation.id)
    .filter((id) => id !== primary.id);

  const firstMsgId = firstInboundMessageId(dump, primary.id);
  const externalId = firstMsgId
    ? `conv_${primary.id}_msg_${firstMsgId}`
    : `conv_${primary.id}_msg_none`;

  const sourceDetails = buildChatwootSourceDetails(
    {
      channel: channel.leadSource,
      externalId,
      chatwootUrl: buildChatwootUrl(chatwootBaseUrl, dump.accountId, primary.id),
    },
    group.normalizationFailed,
  );

  const enrichedSourceDetails: Record<string, unknown> = {
    ...sourceDetails,
    raw_phone: group.rawPhone,
    source_confidence: 'unknown',
    path_lost_at: 'unknown',
    import_meta: {
      merged_conversation_ids: mergedIds,
      merged_count: mergedIds.length,
      identifier_kind: group.kind,
    },
  };

  const leadName = contact?.name?.trim() || null;
  const uuid = randomUUID();
  const university = extractUniversityFromMessages(
    inboundMessageContents(dump, primary.id),
    UNIVERSITY_LOOKUP,
  );
  const genderResult = extractGenderFromMessages(inboundMessageContents(dump, primary.id));

  return {
    uuid,
    lead: {
      uuid,
      lead_phone: group.key,
      lead_name: leadName,
      lead_source: channel.leadSource,
      message_from: channel.messageFrom,
      created_at: primary.created_at,
      updated_at: primary.updated_at,
      last_contact_at: lastContactAt(dump, primary),
      chatwoot_conversation_id: primary.id,
      chatwoot_contact_id: primary.contact_id,
      source_details: enrichedSourceDetails,
      funnel_status: 'yeni',
      student_stage: 'unknown',
      language: 'tr',
      lead_score: 0,
      sla_status: 'on_time',
      is_deleted: false,
      is_archived: false,
    },
    details: {
      lead_uuid: uuid,
      university,
      student_gender: genderResult.gender,
    },
    meta: {
      identifierKind: group.kind,
      normalizationFailed: group.normalizationFailed,
      mergedConversationIds: mergedIds,
      primaryConversationId: primary.id,
    },
  };
}

/**
 * Transforms parsed Chatwoot dump into old_leads import rows with deduplication.
 * @param dump - Parsed dump indexes.
 * @param chatwootBaseUrl - Chatwoot instance base URL for source_details links.
 */
export function buildOldLeadRows(
  dump: ChatwootDumpData,
  chatwootBaseUrl: string,
): BuildOldLeadsResult {
  const phoneGroups = new Map<string, IdentifierGroup>();
  const instagramGroups = new Map<string, IdentifierGroup>();
  const skipped: SkippedConversation[] = [];

  for (const conversation of dump.conversations) {
    const identifier = resolveIdentifier(dump, conversation.contact_id);
    if (!identifier) {
      const contact = dump.contacts.get(conversation.contact_id);
      skipped.push({
        conversationId: conversation.id,
        contactId: conversation.contact_id,
        reason: 'no_phone_or_instagram_handle',
        contactName: contact?.name ?? null,
      });
      continue;
    }

    const targetMap = identifier.kind === 'phone' ? phoneGroups : instagramGroups;
    const existing = targetMap.get(identifier.key);

    if (existing) {
      existing.conversations.push({ conversation, contactId: conversation.contact_id });
    } else {
      targetMap.set(identifier.key, {
        ...identifier,
        conversations: [{ conversation, contactId: conversation.contact_id }],
      });
    }
  }

  const allGroups = [...phoneGroups.values(), ...instagramGroups.values()];
  const rows = allGroups.map((group) => buildRowForGroup(dump, group, chatwootBaseUrl));

  const mergedPhoneGroups = [...phoneGroups.values()].filter(
    (g) => g.conversations.length > 1,
  ).length;
  const mergedInstagramGroups = [...instagramGroups.values()].filter(
    (g) => g.conversations.length > 1,
  ).length;

  const byChannel = { whatsapp: 0, instagram: 0 };
  for (const row of rows) {
    byChannel[row.lead.lead_source]++;
  }

  return {
    rows,
    skipped,
    stats: {
      conversationsParsed: dump.conversations.length,
      phoneGroups: phoneGroups.size,
      instagramGroups: instagramGroups.size,
      mergedPhoneGroups,
      mergedInstagramGroups,
      normalizationFailed: rows.filter((r) => r.meta.normalizationFailed).length,
      universityExtracted: rows.filter((r) => r.details.university != null).length,
      genderExtracted: rows.filter((r) => r.details.student_gender != null).length,
      byChannel,
    },
  };
}

/**
 * Redacts phone numbers in sample output for dry-run display.
 * @param phone - Raw phone or handle.
 */
export function redactContactIdentifier(phone: string): string {
  if (/^[a-z0-9._]{1,30}$/.test(phone)) {
    return phone.length <= 4 ? phone : `${phone.slice(0, 2)}***${phone.slice(-2)}`;
  }
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
}

/**
 * Builds a safe sample object for dry-run logging.
 * @param row - Built import row.
 */
export function toSampleRow(row: BuiltOldLeadRow): Record<string, unknown> {
  return {
    lead_phone: redactContactIdentifier(row.lead.lead_phone),
    lead_name: row.lead.lead_name,
    lead_source: row.lead.lead_source,
    message_from: row.lead.message_from,
    chatwoot_conversation_id: row.lead.chatwoot_conversation_id,
    university: row.details.university,
    merged_count: row.meta.mergedConversationIds.length,
    normalization_failed: row.meta.normalizationFailed,
  };
}
