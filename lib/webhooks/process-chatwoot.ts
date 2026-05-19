/**
 * Chatwoot webhook processor.
 * Handles lead creation (conversation_created / message_created) and
 * label-driven CRM updates (conversation_updated).
 */
import {
  CHATWOOT_DORM_AWAITING_LABELS,
  CHATWOOT_FUNNEL_LABELS,
  CHATWOOT_LABEL_IS_ORGANIC,
  CHATWOOT_LEAD_SOURCE_LABELS,
  CHATWOOT_MESSAGE_FROM_LABELS,
  CHATWOOT_PERSONA_LABELS,
  CHATWOOT_REFERRAL_DOMAIN_LABELS,
  CHATWOOT_SPECIAL_STATE_LABELS,
  CHATWOOT_STUDENT_STAGE_LABELS,
  CHATWOOT_UNI_YEAR_LABELS,
  DEFAULT_FUNNEL_STATUS,
  DEFAULT_STUDENT_STAGE,
  getLabelFieldTargets,
  RETRY_DELAYS_MS,
} from '@/lib/constants';
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import { buildChatwootSourceDetails } from '@/lib/leads/source-details';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramToManagers } from '@/lib/telegram';
import {
  ChatwootPayloadSchema,
  type ChatwootConversationCreated,
  type ChatwootConversationUpdated,
  type ChatwootMessageCreated,
} from '@/types/webhooks';
import type { Database, Json } from '@/types/database';

type LeadsUpdate = Database['public']['Tables']['leads']['Update'];

type InboundChatwootPayload = ChatwootConversationCreated | ChatwootMessageCreated;

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
  source_details: Record<string, unknown> | null;
}

/** Record of a single field change for contact_history. */
interface FieldChangeRecord {
  field: string;
  previous_value: unknown;
  current_value: unknown;
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
 * Processes a Chatwoot webhook payload.
 * @param body - Raw webhook body (unknown until validated).
 */
export async function processChatwoot(body: unknown): Promise<void> {
  const parsed = ChatwootPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[chatwoot] invalid payload:', parsed.error.flatten());
    await sendTelegramToManagers(
      `[CRM] Chatwoot webhook validation failed.\n${parsed.error.message}`,
    );
    return;
  }

  const payload = parsed.data;

  if (payload.event === 'conversation_updated') {
    await withRetry(() => handleLeadUpdate(payload), 'label sync');
    return;
  }

  if (payload.event === 'conversation_created' || payload.event === 'message_created') {
    await handleLeadCreate(payload);
  }
}

/**
 * Existing lead creation path for conversation_created and message_created.
 * @param payload - Parsed inbound Chatwoot payload.
 */
async function handleLeadCreate(payload: InboundChatwootPayload): Promise<void> {
  const phone = payload.meta?.sender?.phone_number;

  if (!phone) {
    console.error('[chatwoot] missing phone number in payload');
    return;
  }

  const channelLower = (payload.channel ?? '').toLowerCase();
  const isInstagram = channelLower.includes('instagram');
  const channel = isInstagram ? 'instagram' : 'whatsapp';
  const leadSource = isInstagram ? 'instagram' : 'whatsapp';

  const referral = payload.additional_attributes?.referral as
    | Record<string, string>
    | undefined;

  const externalId = `conv_${payload.id}_msg_${payload.message?.id ?? 'unknown'}`;
  const chatwootUrl = payload.conversation?.id
    ? `https://app.chatwoot.com/conversations/${payload.conversation.id}`
    : null;

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

  await createLeadFromWebhook({
    rawPhone: phone,
    leadName: payload.meta?.sender?.name ?? null,
    leadSource,
    messageFrom: channel,
    language: 'tr',
    isOrganic: referral ? false : true,
    sourceDetails,
    interactionSource: channel,
    metadata: { chatwoot_event: payload.event, payload_id: payload.id },
  });
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
function extractLabelDiff(
  changedAttributes: ChatwootConversationUpdated['changed_attributes'],
): { added: string[]; removed: string[] } | null {
  for (const attr of changedAttributes) {
    if (!('labels' in attr)) continue;

    const labelsChange = attr.labels;
    const current = normalizeLabelArray(labelsChange.current_value);
    const previous = normalizeLabelArray(labelsChange.previous_value);
    const currentSet = new Set(current);
    const previousSet = new Set(previous);

    const added = current.filter((l) => !previousSet.has(l));
    const removed = previous.filter((l) => !currentSet.has(l));

    return { added, removed };
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
  if (field === 'funnel_status' && CHATWOOT_FUNNEL_LABELS.has(label)) return label;
  if (field === 'student_stage' && CHATWOOT_STUDENT_STAGE_LABELS.has(label)) return label;
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
function getLeadFieldValue(
  lead: LeadSyncRow,
  field: string,
): string | boolean | null {
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
    default:
      return null;
  }
}

/**
 * Resolves cleared value when a label is removed from a single-value field.
 * @param field - Target CRM field name.
 * @returns Cleared value.
 */
function resolveClearedValue(field: string): string | boolean | null {
  if (field === 'funnel_status') return DEFAULT_FUNNEL_STATUS;
  if (field === 'student_stage') return DEFAULT_STUDENT_STAGE;
  if (field === 'persona_type' || field === 'special_state') return null;
  if (field === 'message_from' || field === 'lead_source' || field === 'is_organic') return null;
  if (field === 'uni_year' || field === 'referral_domain') return null;
  return null;
}

/**
 * Finds an active lead by Chatwoot conversation id in source_details.external_id.
 * @param conversationId - Chatwoot conversation id.
 * @returns Lead row or null.
 */
async function findLeadByChatwootConversation(
  conversationId: number,
): Promise<LeadSyncRow | null> {
  const client = createServiceClient();
  const idStr = String(conversationId);

  const { data: exact, error: exactError } = await client
    .from('leads')
    .select(
      'uuid, funnel_status, student_stage, persona_type, special_state, message_from, lead_source, is_organic, source_details',
    )
    .eq('is_deleted', false)
    .eq('source_details->>external_id', idStr)
    .maybeSingle();

  if (exactError) {
    throw new Error(`Lead lookup failed: ${exactError.message}`);
  }

  if (exact) return exact as LeadSyncRow;

  const prefix = `conv_${idStr}_%`;
  const { data: prefixed, error: prefixError } = await client
    .from('leads')
    .select(
      'uuid, funnel_status, student_stage, persona_type, special_state, message_from, lead_source, is_organic, source_details',
    )
    .eq('is_deleted', false)
    .like('source_details->>external_id', prefix)
    .limit(1)
    .maybeSingle();

  if (prefixError) {
    throw new Error(`Lead prefix lookup failed: ${prefixError.message}`);
  }

  return prefixed as LeadSyncRow | null;
}

/**
 * Applies Chatwoot label changes to CRM fields for an existing lead.
 * @param payload - Parsed conversation_updated payload.
 */
export async function handleLeadUpdate(payload: ChatwootConversationUpdated): Promise<void> {
  const labelDiff = extractLabelDiff(payload.changed_attributes);
  if (!labelDiff) return;

  const { added, removed } = labelDiff;
  if (added.length === 0 && removed.length === 0) return;

  const conversationId = payload.conversation?.id ?? payload.id;
  const lead = await findLeadByChatwootConversation(conversationId);

  if (!lead) {
    console.warn(
      `[chatwoot] no lead for conversation ${conversationId} (external_id lookup)`,
    );
    return;
  }

  const client = createServiceClient();
  const leadsUpdates: LeadsUpdate = {};
  const detailsUpdates: Record<string, string | null> = {};
  const fieldChanges: FieldChangeRecord[] = [];

  let referralDomain: string | null | undefined;
  let dormAwaiting: string[] | undefined;
  let uniYear: string | null | undefined = undefined;

  const needsDetails =
    added.some((l) => CHATWOOT_DORM_AWAITING_LABELS.has(l) || CHATWOOT_UNI_YEAR_LABELS.has(l)) ||
    removed.some((l) => CHATWOOT_DORM_AWAITING_LABELS.has(l) || CHATWOOT_UNI_YEAR_LABELS.has(l));

  let existingUniYear: string | null = null;

  if (needsDetails) {
    const { data: detailsRow, error: detailsError } = await client
      .from('lead_details')
      .select('dorm_awaiting, uni_year')
      .eq('lead_uuid', lead.uuid)
      .maybeSingle();

    if (detailsError) {
      throw new Error(`lead_details fetch failed: ${detailsError.message}`);
    }

    dormAwaiting = [...(detailsRow?.dorm_awaiting ?? [])];
    existingUniYear = detailsRow?.uni_year ?? null;
    uniYear = existingUniYear;
  }

  const recordChange = (field: string, previous: unknown, current: unknown) => {
    fieldChanges.push({ field, previous_value: previous, current_value: current });
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
        detailsUpdates.uni_year = value;
        recordChange('uni_year', prev, value);
        continue;
      }

      if (target.table === 'source_details' && target.field === 'referral_domain') {
        const value = resolveLabelValue(label, 'referral_domain') as string;
        const prev = lead.source_details?.referral_domain ?? null;
        referralDomain = value;
        recordChange('referral_domain', prev, value);
        continue;
      }

      if (target.table === 'leads') {
        const value = resolveLabelValue(label, target.field);
        if (value === null && target.field !== 'is_organic') continue;
        const prev = getLeadsUpdateField(leadsUpdates, target.field) ?? getLeadFieldValue(lead, target.field);
        assignLeadsField(leadsUpdates, target.field, value);
        recordChange(target.field, prev, value);
      }
    }
  };

  const applyRemoved = (label: string) => {
    for (const target of getLabelFieldTargets(label)) {
      if (target.table === 'none') continue;

      if (target.table === 'lead_details' && target.field === 'dorm_awaiting') {
        if (!dormAwaiting) continue;
        if (!dormAwaiting.includes(label)) continue;
        const prev = [...dormAwaiting];
        dormAwaiting = dormAwaiting.filter((d) => d !== label);
        recordChange('dorm_awaiting', prev, [...dormAwaiting]);
        continue;
      }

      if (target.table === 'lead_details' && target.field === 'uni_year') {
        const mapped = resolveLabelValue(label, 'uni_year');
        const current = uniYear ?? existingUniYear;
        if (mapped !== null && current !== mapped) continue;
        const prev = current;
        uniYear = null;
        detailsUpdates.uni_year = null;
        recordChange('uni_year', prev, null);
        continue;
      }

      if (target.table === 'source_details' && target.field === 'referral_domain') {
        const mapped = resolveLabelValue(label, 'referral_domain');
        const current = referralDomain ?? (lead.source_details?.referral_domain as string | null) ?? null;
        if (mapped !== null && current !== mapped) continue;
        const prev = current;
        referralDomain = null;
        recordChange('referral_domain', prev, null);
        continue;
      }

      if (target.table === 'leads') {
        const mapped = resolveLabelValue(label, target.field);
        const current = getLeadsUpdateField(leadsUpdates, target.field) ?? getLeadFieldValue(lead, target.field);
        if (mapped !== null && current !== mapped) continue;
        const prev = current;
        const cleared = resolveClearedValue(target.field);
        assignLeadsField(leadsUpdates, target.field, cleared);
        recordChange(target.field, prev, cleared);
      }
    }
  };

  for (const label of added) applyAdded(label);
  for (const label of removed) applyRemoved(label);

  const interactionSource =
    lead.message_from === 'instagram' || lead.message_from === 'whatsapp'
      ? lead.message_from
      : 'whatsapp';

  if (Object.keys(leadsUpdates).length > 0) {
    const { error: leadError } = await client.from('leads').update(leadsUpdates).eq('uuid', lead.uuid);

    if (leadError) {
      throw new Error(`leads update failed: ${leadError.message}`);
    }
  }

  if (referralDomain !== undefined) {
    const merged = {
      ...(lead.source_details ?? {}),
      referral_domain: referralDomain,
    };

    const { error: sdError } = await client
      .from('leads')
      .update({ source_details: merged })
      .eq('uuid', lead.uuid);

    if (sdError) {
      throw new Error(`source_details update failed: ${sdError.message}`);
    }
  }

  if (dormAwaiting !== undefined) {
    const { error: dormError } = await client.from('lead_details').upsert(
      { lead_uuid: lead.uuid, dorm_awaiting: dormAwaiting },
      { onConflict: 'lead_uuid' },
    );

    if (dormError) {
      throw new Error(`lead_details dorm_awaiting upsert failed: ${dormError.message}`);
    }
  }

  if (detailsUpdates.uni_year !== undefined) {
    const { error: uniError } = await client.from('lead_details').upsert(
      { lead_uuid: lead.uuid, uni_year: detailsUpdates.uni_year },
      { onConflict: 'lead_uuid' },
    );

    if (uniError) {
      throw new Error(`lead_details uni_year upsert failed: ${uniError.message}`);
    }
  }

  for (const change of fieldChanges) {
    const { error: historyError } = await client.from('contact_history').insert({
      lead_uuid: lead.uuid,
      interaction_type: 'status_change',
      interaction_source: interactionSource,
      funnel_status_at_time:
        change.field === 'funnel_status'
          ? (change.current_value as string)
          : lead.funnel_status,
      previous_status:
        change.field === 'funnel_status' ? (change.previous_value as string) : null,
      status_changed: change.field === 'funnel_status',
      notes: `Chatwoot label sync: ${change.field} updated`,
      metadata: {
        chatwoot_event: 'conversation_updated',
        conversation_id: conversationId,
        field: change.field,
        previous_value: change.previous_value,
        current_value: change.current_value,
        added_labels: added,
        removed_labels: removed,
      } as Json,
    });

    if (historyError) {
      throw new Error(`contact_history insert failed: ${historyError.message}`);
    }
  }
}
