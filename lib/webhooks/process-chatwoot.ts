/**
 * Chatwoot webhook processor.
 * Handles lead creation (conversation_created / message_created) and
 * label-driven CRM updates (conversation_updated).
 */
import { env } from '@/lib/env';
import {
  CHATWOOT_24H_RESTRICTED_LABEL,
  CHATWOOT_DEAL_AWAITING_LABEL,
  CHATWOOT_DORM_AWAITING_LABELS,
  CHATWOOT_FUNNEL_LABELS,
  CHATWOOT_LABEL_IS_ORGANIC,
  CHATWOOT_LEAD_SOURCE_LABELS,
  CHATWOOT_MESSAGE_FROM_LABELS,
  CHATWOOT_PERSONA_LABELS,
  CHATWOOT_REFERRAL_DOMAIN_LABELS,
  CHATWOOT_SPECIAL_STATE_LABELS,
  CHATWOOT_UNI_YEAR_LABELS,
  DEFAULT_FUNNEL_STATUS,
  normalizeChatwootFunnelLabel,
  getLabelFieldTargets,
  resolveStudentStageFromChatwootLabel,
  RETRY_DELAYS_MS,
} from '@/lib/constants';
import { persistChatwootConversationLink, shouldSkipInboundEcho } from '@/lib/chatwoot/sync-engine';
import {
  mapLabelToFieldValue,
  resolveDormAwaitingFromRemainingLabels,
  resolveFieldAfterLabelRemoval,
  type SingleValueLabelField,
} from '@/lib/chatwoot/resolve-remaining-labels';
import { lookupSchoolShortname } from '@/lib/leads/lookup-school-shortname';
import { budgetTierWritePayload } from '@/lib/leads/budget-tier';
import {
  extractCustomAttributeDiff,
  mapButce,
  mapKayipNedeni,
  mapOdaTipiInbound,
  mapOgrenciCinsiyet,
  normalizeText,
  parseMoveInDate,
  resolveLostTransition,
  type LossIntent,
} from '@/lib/chatwoot/custom-attributes';
import { isChatwootAssigneeSyncEnabled, isChatwootLabelSyncEnabled } from '@/lib/env';
import type { LeadContactIdentifierKind } from '@/lib/leads/contact-identifier';
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import { mergeChatwootIntoExistingLead } from '@/lib/leads/merge-chatwoot-duplicate';
import { applyChatwootAssigneeToLead } from '@/lib/leads/sync-assignee';
import { buildChatwootSourceDetails } from '@/lib/leads/source-details';
import { resolveInboundAssignee } from '@/lib/webhooks/extract-assignee';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToManagers } from '@/lib/telegram';
import {
  ChatwootPayloadSchema,
  ChatwootConversationUpdatedSchema,
  type ChatwootConversationCreated,
  type ChatwootConversationUpdated,
  type ChatwootMessageCreated,
} from '@/types/webhooks';
import type { Database, Json } from '@/types/database';

type LeadsUpdate = Database['public']['Tables']['leads']['Update'];

type InboundChatwootPayload = ChatwootConversationCreated | ChatwootMessageCreated;

type ChatwootPhonePayload = {
  channel?: string;
  meta?: ChatwootConversationCreated['meta'];
  contact?: ChatwootConversationCreated['contact'];
  sender?: ChatwootConversationCreated['sender'];
};

/** Resolved contact identifier for lead creation. */
type ResolvedChatwootContact = {
  kind: LeadContactIdentifierKind;
  raw: string;
};

/** Lead row fields loaded for label sync. */
interface LeadSyncRow {
  uuid: string;
  funnel_status: string;
  student_stage: string;
  persona_type: string | null;
  special_state: string | null;
  message_from: string | null;
  lead_source: string;
  is_organic: boolean | null;
  deal_awaiting: boolean;
  is_24h_restricted: boolean;
  source_details: Record<string, unknown> | null;
  label_sync_source: string | null;
  label_synced_at: string | null;
  loss_reason: string | null;
  funnel_status_before_lost: string | null;
}

/** Record of a single field change for contact_history. */
interface FieldChangeRecord {
  field: string;
  previous_value: unknown;
  current_value: unknown;
  origin?: 'label' | 'custom_attribute';
}

/**
 * Sleeps for the given number of milliseconds.
 * @param ms - Milliseconds to wait.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs an async operation with retry delays (0 → 5s → 15s).
 * @param operation - Async function to execute.
 * @param context - Description for error alerts.
 */
async function withRetry(operation: () => Promise<void>, context: string): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }

    try {
      await operation();
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[chatwoot] ${context} attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  await sendTelegramToManagers(
    `[CRM] Chatwoot ${context} failed after ${RETRY_DELAYS_MS.length} attempts.\nError: ${lastError?.message}`,
  );
}

/**
 * Reactivates a lost lead when a new inbound message arrives.
 * Clears funnel_status → 'yeni', clears loss_reason, sets assigned_to = null (Lead Hub).
 */
async function reactivateLostLead(leadUuid: string, messageFrom: string | null): Promise<void> {
  const client = createServiceClient();

  await client
    .from('leads')
    .update({
      funnel_status: DEFAULT_FUNNEL_STATUS,
      loss_reason: null,
      funnel_status_before_lost: null,
      assigned_to: null,
    })
    .eq('uuid', leadUuid);

  const interactionSource =
    messageFrom === 'instagram' || messageFrom === 'whatsapp' ? messageFrom : 'whatsapp';

  await client.from('contact_history').insert({
    lead_uuid: leadUuid,
    interaction_type: 'status_change',
    interaction_source: interactionSource,
    funnel_status_at_time: DEFAULT_FUNNEL_STATUS,
    previous_status: 'lost',
    status_changed: true,
    notes: 'Lead reactivated — new inbound message after lost status.',
    metadata: { event: 'lost_reactivation' },
  });

  console.info(`[chatwoot] lost lead reactivated uuid=${leadUuid}`);
}

/**
 * Processes a Chatwoot webhook payload.
 * @param body - Raw webhook body (unknown until validated).
 */
export async function processChatwoot(body: unknown): Promise<void> {
  const parsed = ChatwootPayloadSchema.safeParse(body);

  if (!parsed.success) {
    // Fallback: if the event is conversation_updated, try re-parsing with just the
    // fields handleLeadUpdate needs. The strict schema occasionally rejects valid
    // Chatwoot payloads due to unexpected field shapes in nested objects.
    const rawEvent =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>).event
        : undefined;

    if (rawEvent === 'conversation_updated') {
      const loose = ChatwootConversationUpdatedSchema.safeParse(body);
      if (loose.success) {
        await withRetry(() => handleLeadUpdate(loose.data), 'conversation update');
        return;
      }
    }

    console.error('[chatwoot] invalid payload:', parsed.error.flatten());
    await sendTelegramToManagers(
      `[CRM] Chatwoot webhook validation failed.\n${parsed.error.message}`,
    );
    return;
  }

  const payload = parsed.data;

  if (payload.event === 'conversation_updated') {
    await withRetry(() => handleLeadUpdate(payload), 'conversation update');
    return;
  }

  if (payload.event === 'conversation_created') {
    await handleLeadCreate(payload);
    // Write the first message immediately after the conversation link is persisted.
    // Without this, message_created may arrive before the link exists and silently skip.
    if (payload.message?.id) {
      await withRetry(
        () => handleMessageCreated(payload as unknown as ChatwootMessageCreated),
        'message sync',
      );
    }
    return;
  }

  if (payload.event === 'message_created') {
    // Sadece incoming mesajlar yeni lead yaratır; konuşma zaten bağlıysa atla
    if (payload.message_type !== 'outgoing') {
      const conversationId = payload.conversation?.id ?? payload.id;
      const existingLead = await findLeadByChatwootConversation(conversationId);
      if (!existingLead) {
        await handleLeadCreate(payload);
      } else if (existingLead.funnel_status === 'lost') {
        // New inbound message on a lost lead — reactivate to Lead Hub.
        await reactivateLostLead(existingLead.uuid, existingLead.message_from);
      }
    }
    // Hem incoming hem outgoing lead_messages'a yazılır
    await withRetry(() => handleMessageCreated(payload), 'message sync');
  }
}

/**
 * Resolves a contact phone from Chatwoot meta, contact, or sender fields.
 * @param payload - Chatwoot payload subset that may carry phone numbers.
 * @returns Phone string or null.
 */
function extractChatwootPhone(payload: ChatwootPhonePayload): string | null {
  const candidates = [
    payload.meta?.sender?.phone_number,
    payload.contact?.phone_number,
    payload.sender?.phone_number,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

/**
 * Reads Instagram username from Chatwoot additional_attributes.
 * @param attrs - Chatwoot contact additional_attributes object.
 * @returns Username or null.
 */
function readInstagramUsername(attrs: Record<string, unknown> | undefined): string | null {
  if (!attrs) return null;
  const username = attrs.social_instagram_user_name;
  if (typeof username === 'string' && username.trim().length > 0) {
    return username.trim();
  }
  return null;
}

/**
 * Resolves Instagram handle from Chatwoot contact, sender, or meta sender fields.
 * @param payload - Chatwoot payload subset that may carry Instagram metadata.
 * @returns Handle string or null.
 */
function extractChatwootInstagramHandle(payload: ChatwootPhonePayload): string | null {
  const holders = [payload.contact, payload.sender, payload.meta?.sender];

  for (const holder of holders) {
    if (!holder) continue;

    const fromAttrs = readInstagramUsername(holder.additional_attributes);
    if (fromAttrs) return fromAttrs;

    if (typeof holder.identifier === 'string' && holder.identifier.trim().length > 0) {
      const identifier = holder.identifier.trim();
      if (identifier !== 'sender_username') {
        return identifier;
      }
    }
  }

  return null;
}

/**
 * Returns true when the Chatwoot channel is Instagram.
 * @param channel - Chatwoot channel string from payload.
 */
function isInstagramChannel(channel: string | undefined): boolean {
  return (channel ?? '').toLowerCase().includes('instagram');
}

/**
 * Resolves phone or Instagram handle for lead creation from a Chatwoot payload.
 * @param payload - Inbound Chatwoot payload.
 * @returns Contact kind and raw value, or null when neither is available.
 */
function resolveChatwootContact(payload: ChatwootPhonePayload): ResolvedChatwootContact | null {
  const phone = extractChatwootPhone(payload);
  if (phone) {
    return { kind: 'phone', raw: phone };
  }

  if (isInstagramChannel(payload.channel)) {
    const handle = extractChatwootInstagramHandle(payload);
    if (handle) {
      return { kind: 'instagram', raw: handle };
    }
  }

  return null;
}

/**
 * Resolves display name from Chatwoot meta, contact, or sender fields.
 * @param payload - Chatwoot payload subset that may carry a name.
 * @returns Name string or null.
 */
function extractChatwootLeadName(payload: ChatwootPhonePayload): string | null {
  const candidates = [payload.meta?.sender?.name, payload.contact?.name, payload.sender?.name];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

/**
 * Resolves Chatwoot message id from message object or first entry in messages[].
 * @param payload - Inbound Chatwoot payload.
 * @returns Message id or fallback string.
 */
function resolveChatwootMessageId(payload: InboundChatwootPayload): number | string {
  if (payload.message?.id != null) {
    return payload.message.id;
  }

  const withMessages = payload as InboundChatwootPayload & {
    messages?: { id?: number }[];
  };

  const firstId = withMessages.messages?.[0]?.id;
  return firstId ?? 'unknown';
}

function inboundPayloadFromConversationUpdated(
  payload: ChatwootConversationUpdated,
): InboundChatwootPayload {
  return {
    event: 'conversation_created',
    id: payload.id,
    channel: payload.channel,
    meta: payload.meta,
    contact: payload.contact,
    sender: payload.sender,
    conversation: payload.conversation,
  };
}

/**
 * Returns true when conversation_updated indicates the thread was reopened.
 * @param changedAttributes - Chatwoot changed_attributes array.
 */
function conversationWasReopened(
  changedAttributes: ChatwootConversationUpdated['changed_attributes'],
): boolean {
  for (const attr of changedAttributes) {
    if (!('status' in attr)) continue;
    const status = attr.status as { current_value?: unknown; previous_value?: unknown };
    const current = String(status.current_value ?? '').toLowerCase();
    const previous = String(status.previous_value ?? '').toLowerCase();
    if (current === 'open' && previous !== 'open') {
      return true;
    }
  }
  return false;
}

/**
 * Existing lead creation path for conversation_created and message_created.
 * @param payload - Parsed inbound Chatwoot payload.
 */
async function handleLeadCreate(payload: InboundChatwootPayload): Promise<void> {
  const contact = resolveChatwootContact(payload);
  const conversationId = payload.conversation?.id ?? payload.id;

  if (!contact) {
    console.error(
      `[chatwoot] missing contact identifier event=${payload.event} conversation=${conversationId} channel=${payload.channel ?? 'n/a'} message_type=${payload.message_type ?? 'n/a'}`,
    );
    return;
  }

  const isInstagram = isInstagramChannel(payload.channel);
  const channel = isInstagram ? 'instagram' : 'whatsapp';
  const leadSource = isInstagram ? 'instagram' : 'whatsapp';

  const referral = payload.additional_attributes?.referral as Record<string, string> | undefined;

  const messageId = resolveChatwootMessageId(payload);
  const externalId = `conv_${conversationId}_msg_${messageId}`;
  const baseUrl = env.CHATWOOT_BASE_URL.replace(/\/$/, '');
  const chatwootUrl = env.CHATWOOT_ACCOUNT_ID
    ? `${baseUrl}/app/accounts/${env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}`
    : `${baseUrl}/app/conversations/${conversationId}`;

  const sourceDetails = buildChatwootSourceDetails(
    {
      channel,
      externalId,
      chatwootUrl,
      referral: referral
        ? {
            ref_code: referral.ref_code ?? referral.source_url,
            ad_id: referral.ad_id,
            campaign_id: referral.campaign_id,
            adset_id: referral.adset_id,
            placement: referral.placement,
          }
        : undefined,
      isOrganic: referral ? false : true,
    },
    false,
  );

  const result = await createLeadFromWebhook({
    identifierKind: contact.kind,
    rawPhone: contact.kind === 'phone' ? contact.raw : undefined,
    instagramHandle: contact.kind === 'instagram' ? contact.raw : undefined,
    leadName: extractChatwootLeadName(payload),
    leadSource,
    messageFrom: channel,
    language: 'tr',
    isOrganic: referral ? false : true,
    sourceDetails,
    interactionSource: channel,
    metadata: {
      chatwoot_event: payload.event,
      payload_id: payload.id,
      conversation_id: conversationId,
    },
  });

  const leadUuid = result.type === 'created' ? result.uuid : result.existingUuid;

  if (result.type === 'created') {
    console.info(
      `[chatwoot] lead created uuid=${result.uuid} event=${payload.event} conversation=${conversationId}`,
    );
  } else {
    await mergeChatwootIntoExistingLead(result.existingUuid, sourceDetails, {
      leadName: extractChatwootLeadName(payload),
      messageFrom: channel,
    });
    console.info(
      `[chatwoot] merged into existing lead=${result.existingUuid} conversation=${conversationId}`,
    );
  }

  await persistChatwootConversationLink(
    leadUuid,
    conversationId,
    payload.contact?.id ?? payload.sender?.id ?? null,
  );

  const inboundAgent = resolveInboundAssignee(payload);
  if (inboundAgent) {
    await tryInboundAssigneeSync(payload, leadUuid, conversationId);
  }
}

/**
 * Syncs Chatwoot assignee to CRM when enabled and assignee is present on payload.
 * @param payload - Inbound or updated Chatwoot payload.
 * @param leadUuid - CRM lead UUID.
 * @param conversationId - Chatwoot conversation id.
 */
async function tryInboundAssigneeSync(
  payload: InboundChatwootPayload | ChatwootConversationUpdated,
  leadUuid: string,
  conversationId: number,
): Promise<void> {
  if (!isChatwootAssigneeSyncEnabled()) return;

  const agent = resolveInboundAssignee(payload);
  if (!agent) return;

  const syncResult = await applyChatwootAssigneeToLead(leadUuid, agent, conversationId);
  if (syncResult.type === 'updated') {
    console.info(`[chatwoot] assignee synced lead=${leadUuid} conversation=${conversationId}`);
  }
}

/**
 * Normalizes label arrays from changed_attributes values.
 * @param value - Raw current_value or previous_value.
 * @returns String label array.
 */
function normalizeLabelArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Extracts label diff from conversation_updated changed_attributes.
 * @param changedAttributes - Chatwoot changed_attributes array.
 * @returns Added/removed labels or null if labels key absent.
 */
function normalizeLabelsChangeValue(value: unknown): string[] {
  const fromArray = normalizeLabelArray(value);
  const raw = fromArray.length > 0 ? fromArray : [];

  if (raw.length === 0) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map(normalizeChatwootFunnelLabel);
    }
    return [];
  }

  return raw.map(normalizeChatwootFunnelLabel);
}

/**
 * Reads label diff from changed_attributes (Chatwoot uses label_list or labels).
 * @param changedAttributes - Chatwoot changed_attributes array.
 * @returns Added/removed labels or null if no label change entry.
 */
function extractLabelDiff(
  changedAttributes: ChatwootConversationUpdated['changed_attributes'],
): { added: string[]; removed: string[]; current: string[] } | null {
  const labelKeys = ['label_list', 'labels'] as const;

  for (const attr of changedAttributes) {
    for (const key of labelKeys) {
      if (!(key in attr)) continue;

      const labelsChange = attr[key] as {
        current_value?: unknown;
        previous_value?: unknown;
      };
      const current = normalizeLabelsChangeValue(labelsChange.current_value);
      const previous = normalizeLabelsChangeValue(labelsChange.previous_value);
      const currentSet = new Set(current);
      const previousSet = new Set(previous);

      const added = current.filter((l) => !previousSet.has(l));
      const removed = previous.filter((l) => !currentSet.has(l));

      return { added, removed, current };
    }
  }

  return null;
}

/**
 * Resolves the DB value written when a label is applied.
 * @param label - Chatwoot label slug.
 * @param field - Target CRM field name.
 * @returns Value to write, or null to skip.
 */
function resolveLabelValue(label: string, field: string): string | boolean | null {
  if (field === 'is_organic' && label in CHATWOOT_LABEL_IS_ORGANIC) {
    return CHATWOOT_LABEL_IS_ORGANIC[label];
  }
  if (field === 'deal_awaiting' && label === CHATWOOT_DEAL_AWAITING_LABEL) return true;
  if (field === 'is_24h_restricted' && label === CHATWOOT_24H_RESTRICTED_LABEL) return true;
  if (field === 'funnel_status' && CHATWOOT_FUNNEL_LABELS.has(label)) return label;
  if (field === 'student_stage') {
    return resolveStudentStageFromChatwootLabel(label) ?? null;
  }
  if (field === 'persona_type' && CHATWOOT_PERSONA_LABELS.has(label)) return label;
  if (field === 'special_state' && CHATWOOT_SPECIAL_STATE_LABELS.has(label)) return label;
  if (field === 'message_from' && CHATWOOT_MESSAGE_FROM_LABELS.has(label)) return label;
  if (field === 'lead_source' && CHATWOOT_LEAD_SOURCE_LABELS.has(label)) return label;
  if (field === 'uni_year' && CHATWOOT_UNI_YEAR_LABELS.has(label)) return label;
  if (field === 'referral_domain' && CHATWOOT_REFERRAL_DOMAIN_LABELS.has(label)) return label;
  return null;
}

/**
 * Sets a field on the typed leads update payload.
 * @param updates - Mutable leads update object.
 * @param field - Target field name.
 * @param value - New value.
 */
function assignLeadsField(
  updates: LeadsUpdate,
  field: string,
  value: string | boolean | null,
): void {
  switch (field) {
    case 'funnel_status':
      updates.funnel_status = value as string;
      break;
    case 'student_stage':
      updates.student_stage = value as string;
      break;
    case 'persona_type':
      updates.persona_type = value as string | null;
      break;
    case 'special_state':
      updates.special_state = value as string | null;
      break;
    case 'message_from':
      updates.message_from = value as string | null;
      break;
    case 'lead_source':
      updates.lead_source = value as string;
      break;
    case 'is_organic':
      updates.is_organic = value as boolean | null;
      break;
    case 'deal_awaiting':
      updates.deal_awaiting = value as boolean;
      break;
    case 'is_24h_restricted':
      (updates as Record<string, unknown>).is_24h_restricted = value as boolean;
      break;
    default:
      break;
  }
}

/**
 * Reads a pending value from the leads update payload.
 * @param updates - Leads update object.
 * @param field - Target field name.
 * @returns Pending value if set.
 */
function getLeadsUpdateField(
  updates: LeadsUpdate,
  field: string,
): string | boolean | null | undefined {
  switch (field) {
    case 'funnel_status':
      return updates.funnel_status;
    case 'student_stage':
      return updates.student_stage;
    case 'persona_type':
      return updates.persona_type;
    case 'special_state':
      return updates.special_state;
    case 'message_from':
      return updates.message_from;
    case 'lead_source':
      return updates.lead_source;
    case 'is_organic':
      return updates.is_organic;
    case 'deal_awaiting':
      return updates.deal_awaiting;
    case 'is_24h_restricted':
      return (updates as Record<string, unknown>).is_24h_restricted as boolean | undefined;
    default:
      return undefined;
  }
}

/**
 * Reads a leads-table field from the loaded lead row.
 * @param lead - Lead sync row.
 * @param field - Field name on leads.
 * @returns Current stored value.
 */
function getLeadFieldValue(lead: LeadSyncRow, field: string): string | boolean | null {
  switch (field) {
    case 'funnel_status':
      return lead.funnel_status;
    case 'student_stage':
      return lead.student_stage;
    case 'persona_type':
      return lead.persona_type;
    case 'special_state':
      return lead.special_state;
    case 'message_from':
      return lead.message_from;
    case 'lead_source':
      return lead.lead_source;
    case 'is_organic':
      return lead.is_organic;
    case 'deal_awaiting':
      return lead.deal_awaiting;
    case 'is_24h_restricted':
      return lead.is_24h_restricted;
    default:
      return null;
  }
}

/**
 * Finds an active lead by Chatwoot conversation id in source_details.external_id.
 * @param conversationId - Chatwoot conversation id.
 * @returns Lead row or null.
 */
async function findLeadByChatwootConversation(conversationId: number): Promise<LeadSyncRow | null> {
  const client = createServiceClient();
  const idStr = String(conversationId);

  const selectCols =
    'uuid, funnel_status, student_stage, persona_type, special_state, message_from, lead_source, is_organic, deal_awaiting, is_24h_restricted, source_details, label_sync_source, label_synced_at, loss_reason, funnel_status_before_lost';

  const { data: byConvId, error: convError } = await client
    .from('leads')
    .select(selectCols)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .eq('chatwoot_conversation_id', conversationId)
    .maybeSingle();

  if (convError) {
    throw new Error(`Lead lookup by conversation id failed: ${convError.message}`);
  }

  if (byConvId) return byConvId as unknown as LeadSyncRow;

  const { data: exact, error: exactError } = await client
    .from('leads')
    .select(selectCols)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .eq('source_details->>external_id', idStr)
    .maybeSingle();

  if (exactError) {
    throw new Error(`Lead lookup failed: ${exactError.message}`);
  }

  if (exact) return exact as unknown as LeadSyncRow;

  const prefix = `conv_${idStr}_%`;
  const { data: prefixed, error: prefixError } = await client
    .from('leads')
    .select(selectCols)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .like('source_details->>external_id', prefix)
    .limit(1)
    .maybeSingle();

  if (prefixError) {
    throw new Error(`Lead prefix lookup failed: ${prefixError.message}`);
  }

  return prefixed as unknown as LeadSyncRow | null;
}

/**
 * Applies Chatwoot label changes to CRM fields for an existing lead.
 * @param payload - Parsed conversation_updated payload.
 */
export async function handleLeadUpdate(payload: ChatwootConversationUpdated): Promise<void> {
  const conversationId = payload.conversation?.id ?? payload.id;

  const existingLead = await findLeadByChatwootConversation(conversationId);
  if (existingLead) {
    await persistChatwootConversationLink(
      existingLead.uuid,
      conversationId,
      payload.contact?.id ?? payload.sender?.id ?? null,
    );
    await tryInboundAssigneeSync(payload, existingLead.uuid, conversationId);
  }

  const labelDiff = extractLabelDiff(payload.changed_attributes);
  const customAttrDiff = extractCustomAttributeDiff(payload.changed_attributes);

  const labelAdded = labelDiff?.added ?? [];
  const labelRemoved = labelDiff?.removed ?? [];
  const hasLabelChanges = labelAdded.length > 0 || labelRemoved.length > 0;
  const hasCustomAttrChanges = customAttrDiff != null;

  if (!hasLabelChanges && !hasCustomAttrChanges) {
    if (conversationWasReopened(payload.changed_attributes)) {
      const existing = await findLeadByChatwootConversation(conversationId);
      if (!existing) {
        const contact = resolveChatwootContact(payload);
        if (contact) {
          console.info(`[chatwoot] creating lead on reopen conversation=${conversationId}`);
          await handleLeadCreate(inboundPayloadFromConversationUpdated(payload));
        } else {
          console.warn(
            `[chatwoot] reopen without contact identifier conversation=${conversationId} — cannot create lead`,
          );
        }
      }
    }
    return;
  }

  let lead = await findLeadByChatwootConversation(conversationId);

  if (!lead) {
    const contact = resolveChatwootContact(payload);
    if (contact) {
      console.info(`[chatwoot] creating lead before sync conversation=${conversationId}`);
      await handleLeadCreate(inboundPayloadFromConversationUpdated(payload));
      lead = await findLeadByChatwootConversation(conversationId);
    }
  }

  if (!lead) {
    console.warn(`[chatwoot] no lead for conversation ${conversationId} (external_id lookup)`);
    return;
  }

  const leadRow = lead;

  // Labels and custom attributes can echo a CRM-originated push — skip both inside the echo window.
  const echoSkip =
    isChatwootLabelSyncEnabled() &&
    shouldSkipInboundEcho(leadRow.label_sync_source, leadRow.label_synced_at);
  const processLabels = hasLabelChanges && !echoSkip;
  const processCustomAttrs = hasCustomAttrChanges && !echoSkip;
  if (echoSkip && hasLabelChanges) {
    console.info(`[chatwoot] label sync skipped — CRM echo window lead=${leadRow.uuid}`);
  }
  if (echoSkip && hasCustomAttrChanges) {
    console.info(`[chatwoot] custom-attribute sync skipped — CRM echo window lead=${leadRow.uuid}`);
  }

  const added = processLabels ? labelAdded : [];
  const removed = processLabels ? labelRemoved : [];
  const currentLabels = labelDiff?.current ?? [];

  if (!processLabels && !processCustomAttrs) return;

  const client = createServiceClient();
  const leadsUpdates: LeadsUpdate = {};
  const leadDetailsUpdates: Record<string, unknown> = {};
  const fieldChanges: FieldChangeRecord[] = [];

  let referralDomain: string | null | undefined;
  let dormAwaiting: string[] | undefined;
  let uniYear: string | null | undefined = undefined;

  const labelNeedsDetails =
    processLabels &&
    (added.some((l) => CHATWOOT_DORM_AWAITING_LABELS.has(l) || CHATWOOT_UNI_YEAR_LABELS.has(l)) ||
      removed.some((l) => CHATWOOT_DORM_AWAITING_LABELS.has(l) || CHATWOOT_UNI_YEAR_LABELS.has(l)));

  let existingUniYear: string | null = null;
  let detailsRow: {
    dorm_awaiting?: string[] | null;
    uni_year?: string | null;
    university?: string | null;
    school_shortname?: string | null;
    interested_hotel?: string[] | null;
    budget_tier?: string | null;
    move_in?: string | null;
    room_category?: string | null;
    room_type?: string[] | null;
    student_gender?: string | null;
  } | null = null;

  if (labelNeedsDetails || processCustomAttrs) {
    const { data, error: detailsError } = await client
      .from('lead_details')
      .select(
        'dorm_awaiting, uni_year, university, school_shortname, interested_hotel, budget_tier, move_in, room_category, room_type, student_gender',
      )
      .eq('lead_uuid', leadRow.uuid)
      .maybeSingle();

    if (detailsError) {
      throw new Error(`lead_details fetch failed: ${detailsError.message}`);
    }
    detailsRow = data;
  }

  if (labelNeedsDetails) {
    dormAwaiting = [...(detailsRow?.dorm_awaiting ?? [])];
    existingUniYear = detailsRow?.uni_year ?? null;
    uniYear = existingUniYear;
  }

  const recordChange = (
    field: string,
    previous: unknown,
    current: unknown,
    origin: 'label' | 'custom_attribute' = 'label',
  ) => {
    fieldChanges.push({ field, previous_value: previous, current_value: current, origin });
  };

  const applyAdded = (label: string) => {
    for (const target of getLabelFieldTargets(label)) {
      if (target.table === 'none') continue;

      if (target.table === 'lead_details' && target.field === 'dorm_awaiting') {
        if (!dormAwaiting) dormAwaiting = [];
        if (!dormAwaiting.includes(label)) {
          const prev = [...dormAwaiting];
          dormAwaiting.push(label);
          recordChange('dorm_awaiting', prev, [...dormAwaiting]);
        }
        continue;
      }

      if (target.table === 'lead_details' && target.field === 'uni_year') {
        const value = resolveLabelValue(label, 'uni_year') as string;
        const prev = uniYear ?? existingUniYear;
        uniYear = value;
        leadDetailsUpdates.uni_year = value;
        recordChange('uni_year', prev, value);
        continue;
      }

      if (target.table === 'source_details' && target.field === 'referral_domain') {
        const value = resolveLabelValue(label, 'referral_domain') as string;
        const prev = leadRow.source_details?.referral_domain ?? null;
        referralDomain = value;
        recordChange('referral_domain', prev, value);
        continue;
      }

      if (target.table === 'leads') {
        const value = resolveLabelValue(label, target.field);
        if (value === null && target.field !== 'is_organic') continue;
        const prev =
          getLeadsUpdateField(leadsUpdates, target.field) ??
          getLeadFieldValue(leadRow, target.field);
        assignLeadsField(leadsUpdates, target.field, value);
        recordChange(target.field, prev, value);
      }
    }
  };

  const applyRemoved = (label: string) => {
    for (const target of getLabelFieldTargets(label)) {
      if (target.table === 'none') continue;

      if (target.table === 'lead_details' && target.field === 'dorm_awaiting') {
        const prev = [...(dormAwaiting ?? detailsRow?.dorm_awaiting ?? [])];
        const next = resolveDormAwaitingFromRemainingLabels(currentLabels);
        if (!arraysEqual(prev, next)) {
          dormAwaiting = next;
          recordChange('dorm_awaiting', prev, [...next]);
        }
        continue;
      }

      if (target.table === 'lead_details' && target.field === 'uni_year') {
        const field = 'uni_year' satisfies SingleValueLabelField;
        const mapped = mapLabelToFieldValue(label, field);
        const current = uniYear ?? existingUniYear;
        if (mapped !== null && mapped !== current) continue;
        const prev = current;
        const next = resolveFieldAfterLabelRemoval(field, currentLabels) as string | null;
        uniYear = next;
        leadDetailsUpdates.uni_year = next;
        recordChange('uni_year', prev, next);
        continue;
      }

      if (target.table === 'source_details' && target.field === 'referral_domain') {
        const field = 'referral_domain' satisfies SingleValueLabelField;
        const mapped = mapLabelToFieldValue(label, field);
        const current =
          referralDomain ?? (leadRow.source_details?.referral_domain as string | null) ?? null;
        if (mapped !== null && mapped !== current) continue;
        const prev = current;
        const next = resolveFieldAfterLabelRemoval(field, currentLabels) as string | null;
        referralDomain = next;
        recordChange('referral_domain', prev, next);
        continue;
      }

      if (target.table === 'leads') {
        const field = target.field as SingleValueLabelField;
        const mapped = mapLabelToFieldValue(label, field);
        const current =
          getLeadsUpdateField(leadsUpdates, target.field) ??
          getLeadFieldValue(leadRow, target.field);
        if (mapped !== null && mapped !== current) continue;
        const prev = current;
        const next = resolveFieldAfterLabelRemoval(field, currentLabels);
        assignLeadsField(leadsUpdates, target.field, next);
        recordChange(target.field, prev, next);
      }
    }
  };

  if (processLabels) {
    for (const label of added) applyAdded(label);
    for (const label of removed) applyRemoved(label);
  }

  // Apply Chatwoot conversation custom attributes (university, budget, loss reason, ...).
  let lossIntent: LossIntent;

  const applyCustomAttribute = (key: string, current: unknown): void => {
    switch (key) {
      case 'university': {
        const value = normalizeText(current);
        const prev = detailsRow?.university ?? null;
        if (value !== prev) {
          leadDetailsUpdates.university = value;
          recordChange('university', prev, value, 'custom_attribute');
          const shortname = lookupSchoolShortname(value);
          const prevShortname = detailsRow?.school_shortname ?? null;
          if (shortname !== prevShortname) {
            leadDetailsUpdates.school_shortname = shortname;
            recordChange('school_shortname', prevShortname, shortname, 'custom_attribute');
          }
        }
        return;
      }
      case 'ilgili_otel': {
        const value = normalizeText(current);
        const next = value ? [value] : [];
        const prev = [...(detailsRow?.interested_hotel ?? [])];
        if (!arraysEqual(prev, next)) {
          leadDetailsUpdates.interested_hotel = next;
          recordChange('interested_hotel', prev, next, 'custom_attribute');
        }
        return;
      }
      case 'butce': {
        const text = normalizeText(current);
        const tier = mapButce(current);
        if (text && tier === null) return;
        const prev = detailsRow?.budget_tier ?? null;
        if (tier !== prev) {
          Object.assign(leadDetailsUpdates, budgetTierWritePayload(tier));
          recordChange('budget_tier', prev, tier, 'custom_attribute');
        }
        return;
      }
      case 'tasinma_tarihi': {
        const text = normalizeText(current);
        const value = parseMoveInDate(current);
        if (text && value === null) return; // unparseable date — ignore
        const prev = detailsRow?.move_in ?? null;
        if (value !== prev) {
          leadDetailsUpdates.move_in = value;
          recordChange('move_in', prev, value, 'custom_attribute');
        }
        return;
      }
      case 'oda_tiipi': {
        const mapped = mapOdaTipiInbound(current, [...(detailsRow?.room_type ?? [])]);
        if (!mapped) return;
        const prevCategory = detailsRow?.room_category ?? null;
        if (mapped.room_category !== prevCategory) {
          leadDetailsUpdates.room_category = mapped.room_category;
          recordChange('room_category', prevCategory, mapped.room_category, 'custom_attribute');
        }
        const prevRoomType = [...(detailsRow?.room_type ?? [])];
        if (!arraysEqual(prevRoomType, mapped.room_type)) {
          leadDetailsUpdates.room_type = mapped.room_type;
          recordChange('room_type', prevRoomType, mapped.room_type, 'custom_attribute');
        }
        return;
      }
      case 'ogrenci_cinsiyet': {
        const value = mapOgrenciCinsiyet(current);
        const prev = detailsRow?.student_gender ?? null;
        if (value !== prev) {
          leadDetailsUpdates.student_gender = value;
          recordChange('student_gender', prev, value, 'custom_attribute');
        }
        return;
      }
      case 'kayip_nedeni': {
        const value = mapKayipNedeni(current);
        lossIntent = value === null ? 'clear' : 'set';
        if (value !== null) {
          leadsUpdates.loss_reason = value;
        }
        return;
      }
      default:
        return;
    }
  };

  if (processCustomAttrs && customAttrDiff) {
    for (const [key, change] of Object.entries(customAttrDiff)) {
      applyCustomAttribute(key, change.current);
    }
  }

  // Resolve the lost transition (move to / restore from the 'lost' funnel status).
  const lostTransition = resolveLostTransition({
    prevFunnel: leadRow.funnel_status,
    beforeLost: leadRow.funnel_status_before_lost,
    added,
    removed,
    lossIntent,
  });

  let funnelStatusBeforeLost: string | null | undefined;
  if (lostTransition.funnelStatus !== undefined) {
    leadsUpdates.funnel_status = lostTransition.funnelStatus;
  }
  if (lostTransition.funnelStatusBeforeLost !== undefined) {
    funnelStatusBeforeLost = lostTransition.funnelStatusBeforeLost;
  }
  if (lostTransition.clearLossReason) {
    leadsUpdates.loss_reason = null;
  }

  // Reconcile contact_history funnel_status entries to a single net change, then
  // add a loss_reason entry when it changed.
  const finalFunnel = leadsUpdates.funnel_status;
  const reconciledChanges = fieldChanges.filter((c) => c.field !== 'funnel_status');
  if (finalFunnel !== undefined && finalFunnel !== leadRow.funnel_status) {
    reconciledChanges.push({
      field: 'funnel_status',
      previous_value: leadRow.funnel_status,
      current_value: finalFunnel,
      origin: lossIntent ? 'custom_attribute' : 'label',
    });
  }
  if ('loss_reason' in leadsUpdates) {
    const prevLoss = leadRow.loss_reason ?? null;
    const nextLoss = (leadsUpdates.loss_reason as string | null) ?? null;
    if (prevLoss !== nextLoss) {
      reconciledChanges.push({
        field: 'loss_reason',
        previous_value: prevLoss,
        current_value: nextLoss,
        origin: 'custom_attribute',
      });
    }
  }

  const interactionSource =
    leadRow.message_from === 'instagram' || leadRow.message_from === 'whatsapp'
      ? leadRow.message_from
      : 'whatsapp';

  const labelSyncMeta =
    isChatwootLabelSyncEnabled() && reconciledChanges.length > 0
      ? {
          label_sync_source: 'chatwoot' as const,
          label_synced_at: new Date().toISOString(),
        }
      : {};

  const leadWritePayload: Record<string, unknown> = { ...leadsUpdates, ...labelSyncMeta };
  if (funnelStatusBeforeLost !== undefined) {
    leadWritePayload.funnel_status_before_lost = funnelStatusBeforeLost;
  }

  if (Object.keys(leadWritePayload).length > 0) {
    const { error: leadError } = await client
      .from('leads')
      .update(leadWritePayload as LeadsUpdate)
      .eq('uuid', leadRow.uuid);

    if (leadError) {
      throw new Error(`leads update failed: ${leadError.message}`);
    }
  }

  if (referralDomain !== undefined) {
    const merged = {
      ...(leadRow.source_details ?? {}),
      referral_domain: referralDomain,
    };

    const { error: sdError } = await client
      .from('leads')
      .update({ source_details: merged })
      .eq('uuid', leadRow.uuid);

    if (sdError) {
      throw new Error(`source_details update failed: ${sdError.message}`);
    }
  }

  if (dormAwaiting !== undefined) {
    leadDetailsUpdates.dorm_awaiting = dormAwaiting;
  }

  if (Object.keys(leadDetailsUpdates).length > 0) {
    const { error: detailsUpsertError } = await client
      .from('lead_details')
      .upsert({ lead_uuid: leadRow.uuid, ...leadDetailsUpdates }, { onConflict: 'lead_uuid' });

    if (detailsUpsertError) {
      throw new Error(`lead_details upsert failed: ${detailsUpsertError.message}`);
    }
  }

  for (const change of reconciledChanges) {
    const noteSource = change.origin === 'custom_attribute' ? 'custom attribute' : 'label';
    const { error: historyError } = await client.from('contact_history').insert({
      lead_uuid: leadRow.uuid,
      interaction_type: 'status_change',
      interaction_source: interactionSource,
      funnel_status_at_time:
        change.field === 'funnel_status' ? (change.current_value as string) : leadRow.funnel_status,
      previous_status: change.field === 'funnel_status' ? (change.previous_value as string) : null,
      status_changed: change.field === 'funnel_status',
      notes: `Chatwoot ${noteSource} sync: ${change.field} updated`,
      metadata: {
        chatwoot_event: 'conversation_updated',
        conversation_id: conversationId,
        field: change.field,
        previous_value: change.previous_value as Json,
        current_value: change.current_value as Json,
        added_labels: added,
        removed_labels: removed,
      } as Json,
    });

    if (historyError) {
      throw new Error(`contact_history insert failed: ${historyError.message}`);
    }
  }
}

/** Shallow array equality for string arrays. */
function arraysEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

/** Yeni konuşma sayılması için minimum sessizlik süresi (saat). */
const CONVERSATION_GAP_HOURS = 4;

/**
 * message_created event'ini lead_messages ve contact_history'e yazar.
 * Hem incoming hem outgoing mesajlar kaydedilir.
 * Lead bulunamazsa sessizce geçer.
 * @param payload - Parsed ChatwootMessageCreated payload.
 */
async function handleMessageCreated(payload: ChatwootMessageCreated): Promise<void> {
  const conversationId = payload.conversation?.id ?? payload.id;
  const messageId = payload.message?.id;

  if (!messageId) {
    console.warn(`[chatwoot] message_created without message.id conversation=${conversationId}`);
    return;
  }

  const lead = await findLeadByChatwootConversation(conversationId);
  if (!lead) {
    console.info(
      `[chatwoot] no lead for message_created conversation=${conversationId} — skipping message sync`,
    );
    return;
  }

  const content = payload.message?.content ?? null;
  const rawCreatedAt = payload.message?.created_at;
  const messageTimestamp = rawCreatedAt
    ? new Date(rawCreatedAt * 1000).toISOString()
    : new Date().toISOString();

  const senderType = payload.message?.sender?.type ?? null;
  const senderName = payload.message?.sender?.name ?? null;
  const senderId = payload.message?.sender?.id ?? null;
  const isPrivate = payload.message?.private ?? false;
  const messageType = payload.message_type ?? 'incoming';

  await syncMessageToLeadMessages({
    leadUuid: lead.uuid,
    conversationId,
    messageId,
    messageType,
    content,
    senderType,
    senderName,
    senderId,
    isPrivate,
    messageTimestamp,
  });

  // Incoming customer messages reset the WhatsApp 24h window and reopen restriction.
  if (messageType === 'incoming' && !isPrivate) {
    await recordInboundMessageWindow(lead.uuid, messageTimestamp);
  }

  await maybeWriteMessageStart({
    leadUuid: lead.uuid,
    conversationId,
    messageId,
    content,
    messageTimestamp,
    senderType,
    senderName,
  });
}

/**
 * Chatwoot mesajını lead_messages'a upsert eder.
 * Conflict target: chatwoot_message_id (unique index).
 */
async function syncMessageToLeadMessages(params: {
  leadUuid: string;
  conversationId: number;
  messageId: number;
  messageType: string;
  content: string | null;
  senderType: string | null;
  senderName: string | null;
  senderId: number | null;
  isPrivate: boolean;
  messageTimestamp: string;
}): Promise<void> {
  const client = createServiceClient();
  const { error } = await client.from('lead_messages').upsert(
    {
      lead_uuid: params.leadUuid,
      chatwoot_conversation_id: params.conversationId,
      chatwoot_message_id: params.messageId,
      content: params.content,
      message_type: params.messageType,
      sender_type: params.senderType,
      sender_name: params.senderName,
      sender_id: params.senderId,
      is_private: params.isPrivate,
      created_at: params.messageTimestamp,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'chatwoot_message_id' },
  );

  if (error) {
    console.error(
      `[chatwoot] lead_messages upsert failed conversation=${params.conversationId} message=${params.messageId}:`,
      error.message,
    );
  } else {
    console.info(
      `[chatwoot] lead_messages synced lead=${params.leadUuid} message=${params.messageId}`,
    );
  }
}

/**
 * Records the latest incoming (customer) message time on the lead and reopens the
 * WhatsApp 24h window: clears is_24h_restricted when a fresh inbound message arrives.
 * Only the customer's incoming messages reset the window — outgoing replies do not.
 * @param leadUuid - Lead UUID.
 * @param messageTimestamp - ISO timestamp of the incoming message.
 */
async function recordInboundMessageWindow(
  leadUuid: string,
  messageTimestamp: string,
): Promise<void> {
  const client = createServiceClient();
  const { error } = await (
    client as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    }
  )
    .from('leads')
    .update({ last_inbound_message_at: messageTimestamp, is_24h_restricted: false })
    .eq('uuid', leadUuid);

  if (error) {
    console.error(
      `[chatwoot] last_inbound_message_at update failed lead=${leadUuid}: ${error.message}`,
    );
  }
}

/**
 * Konuşma başlangıcını contact_history'e yazar.
 * Son chatwoot kaydından bu yana >= 4 saat geçtiyse yeni message_start insert edilir.
 * Aynı konuşmada devam eden mesajlar için yazılmaz (append-only korunur).
 */
async function maybeWriteMessageStart(params: {
  leadUuid: string;
  conversationId: number;
  messageId: number;
  content: string | null;
  messageTimestamp: string;
  senderType: string | null;
  senderName: string | null;
}): Promise<void> {
  const client = createServiceClient();

  const { data: lastEntry, error: queryError } = await client
    .from('contact_history')
    .select('created_at')
    .eq('lead_uuid', params.leadUuid)
    .eq('interaction_source', 'chatwoot')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (queryError) {
    console.error(
      `[chatwoot] contact_history query failed lead=${params.leadUuid}:`,
      queryError.message,
    );
    return;
  }

  const messageTime = new Date(params.messageTimestamp);
  const lastTime = lastEntry ? new Date(lastEntry.created_at) : null;
  const gapMs = lastTime ? messageTime.getTime() - lastTime.getTime() : Infinity;
  const gapHours = gapMs / (1000 * 60 * 60);

  if (gapHours < CONVERSATION_GAP_HOURS) {
    // Aynı konuşma akışı — yazma
    return;
  }

  const snippet = (params.content ?? '').slice(0, 100);
  const { error: insertError } = await client.from('contact_history').insert({
    lead_uuid: params.leadUuid,
    interaction_type: 'message_start',
    interaction_source: 'chatwoot',
    notes: `Konuşma başladı — "${snippet}"`,
    metadata: {
      sender_type: params.senderType,
      sender_name: params.senderName,
      chatwoot_conversation_id: params.conversationId,
      chatwoot_message_id: params.messageId,
    },
    status_changed: false,
    created_at: params.messageTimestamp,
  });

  if (insertError) {
    console.error(
      `[chatwoot] contact_history message_start failed lead=${params.leadUuid}:`,
      insertError.message,
    );
  } else {
    console.info(
      `[chatwoot] contact_history message_start written lead=${params.leadUuid} conversation=${params.conversationId}`,
    );
  }
}
