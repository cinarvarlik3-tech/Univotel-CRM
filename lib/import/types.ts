/** Parsed row shapes from Chatwoot pg_dump COPY blocks. */

export interface ChatwootContactRow {
  id: number;
  name: string | null;
  phone_number: string | null;
  identifier: string | null;
  additional_attributes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ChatwootConversationRow {
  id: number;
  inbox_id: number;
  contact_id: number;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
  contact_last_seen_at: string | null;
}

export interface ChatwootMessageRow {
  id: number;
  content: string | null;
  conversation_id: number;
  message_type: number;
  created_at: string;
  sender_type: string | null;
  sender_id: number | null;
  private: boolean;
}

export interface ChatwootUserRow {
  id: number;
  name: string | null;
  display_name: string | null;
}

export interface ChatwootInboxRow {
  id: number;
  channel_type: string;
  name: string | null;
}

export interface ChatwootDumpData {
  accountId: number;
  contacts: Map<number, ChatwootContactRow>;
  conversations: ChatwootConversationRow[];
  inboxes: Map<number, ChatwootInboxRow>;
  users: Map<number, ChatwootUserRow>;
  messages: ChatwootMessageRow[];
  messagesByConversation: Map<number, ChatwootMessageRow[]>;
}

export interface SkippedConversation {
  conversationId: number;
  contactId: number;
  reason: string;
  contactName: string | null;
}

export interface BuiltOldLeadRow {
  uuid: string;
  lead: {
    uuid: string;
    lead_phone: string;
    lead_name: string | null;
    lead_source: 'whatsapp' | 'instagram';
    message_from: 'whatsapp' | 'instagram';
    created_at: string;
    updated_at: string;
    last_contact_at: string | null;
    chatwoot_conversation_id: number;
    chatwoot_contact_id: number;
    source_details: Record<string, unknown>;
    funnel_status: 'yeni';
    student_stage: 'unknown';
    language: 'tr';
    lead_score: 0;
    sla_status: 'on_time';
    is_deleted: false;
    is_archived: false;
  };
  details: {
    lead_uuid: string;
    university: string | null;
    student_gender: 'male' | 'female' | null;
  };
  meta: {
    identifierKind: 'phone' | 'instagram';
    normalizationFailed: boolean;
    mergedConversationIds: number[];
    primaryConversationId: number;
  };
}

export interface BuildOldLeadsResult {
  rows: BuiltOldLeadRow[];
  skipped: SkippedConversation[];
  stats: {
    conversationsParsed: number;
    phoneGroups: number;
    instagramGroups: number;
    mergedPhoneGroups: number;
    mergedInstagramGroups: number;
    normalizationFailed: number;
    universityExtracted: number;
    genderExtracted: number;
    byChannel: { whatsapp: number; instagram: number };
  };
}
