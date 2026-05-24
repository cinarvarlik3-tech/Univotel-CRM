/**
 * Lead creation orchestration pipeline.
 * Single entry point for webhook processors and manual API create.
 */
import { RETRY_DELAYS_MS } from '@/lib/constants';
import { assignLead, incrementActiveLeadCount } from '@/lib/leads/assign';
import type { LeadContactIdentifierKind } from '@/lib/leads/contact-identifier';
import { findExistingLead, recordDuplicateSubmission } from '@/lib/leads/deduplicate';
import { normalizeInstagramHandle } from '@/lib/leads/normalize-instagram-handle';
import { normalizePhone } from '@/lib/leads/normalize-phone';
import { calculateSlaDeadline } from '@/lib/leads/sla';
import type { SourceDetails } from '@/lib/leads/source-details';
import {
  buildCollectedDataRow,
  persistCollectedData,
  sourceDetailsToBuildInput,
} from '@/lib/attribution/build-collected-data';
import { incrementDniLeadCount } from '@/lib/dni/list-active-numbers';
import { enrichFromGA4Immediate } from '@/lib/ga4/enrich-from-ga4';
import { runAfterResponse } from '@/lib/webhooks/wait-until';
import { createServiceClient } from '@/lib/supabase/service';
import { sendManagerNotification } from '@/lib/notifications/send-manager-alert';
import { sendTelegramToManagers } from '@/lib/telegram';
import type { Json } from '@/types/database';

/** Input for creating a lead from webhook or manual entry. */
export interface CreateLeadInput {
  /** Required when identifierKind is phone. */
  rawPhone?: string;
  /** Required when identifierKind is instagram. */
  instagramHandle?: string;
  identifierKind: LeadContactIdentifierKind;
  leadName?: string | null;
  leadSource: string;
  messageFrom?: string | null;
  language?: string;
  isOrganic?: boolean | null;
  sourceDetails: SourceDetails;
  interactionSource: 'whatsapp' | 'instagram' | 'netgsm' | 'manual';
  preferredHotelId?: string;
  metadata?: Record<string, unknown>;
}

/** Result of lead creation attempt. */
export type CreateLeadResult =
  | { type: 'created'; uuid: string; assignedTo: string | null }
  | { type: 'duplicate'; existingUuid: string };

/**
 * Sleeps for the given number of milliseconds.
 * @param ms - Milliseconds to wait.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes lead creation with retry logic for transient failures.
 * @param input - Lead creation input parameters.
 * @returns Created or duplicate result.
 */
export async function createLeadFromWebhook(input: CreateLeadInput): Promise<CreateLeadResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }

    try {
      return await executeCreateLead(input);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[create-lead] attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  await sendTelegramToManagers(
    `[CRM] Lead creation failed after 3 attempts.\nSource: ${input.leadSource}\nError: ${lastError?.message}`,
  );
  throw lastError ?? new Error('Lead creation failed');
}

/**
 * Core lead creation logic without retry wrapper.
 * @param input - Lead creation input parameters.
 * @returns Created or duplicate result.
 */
async function executeCreateLead(input: CreateLeadInput): Promise<CreateLeadResult> {
  const identifierKind = input.identifierKind;
  let leadPhone: string;
  let normalizationFailed: boolean;
  let rawIdentifier: string | null = null;

  if (identifierKind === 'instagram') {
    const rawHandle = input.instagramHandle?.trim();
    if (!rawHandle) {
      throw new Error('instagramHandle is required when identifierKind is instagram');
    }
    const { handle, failed } = normalizeInstagramHandle(rawHandle);
    leadPhone = handle;
    normalizationFailed = failed;
    rawIdentifier = failed ? rawHandle : null;
  } else {
    const rawPhone = input.rawPhone?.trim();
    if (!rawPhone) {
      throw new Error('rawPhone is required when identifierKind is phone');
    }
    const { phone, failed } = normalizePhone(rawPhone);
    leadPhone = phone;
    normalizationFailed = failed || input.sourceDetails.normalization_failed;
    rawIdentifier = normalizationFailed ? rawPhone : null;
  }

  const sourceDetails: SourceDetails = {
    ...input.sourceDetails,
    normalization_failed: normalizationFailed,
    raw_phone: rawIdentifier ?? input.sourceDetails.raw_phone ?? null,
  };

  const existing = await findExistingLead(leadPhone, identifierKind);
  if (existing) {
    await recordDuplicateSubmission(existing.uuid, input.interactionSource, {
      ...input.metadata,
      source_details: sourceDetails,
    });
    return { type: 'duplicate', existingUuid: existing.uuid };
  }

  const createdAt = new Date();
  const { deadline } = calculateSlaDeadline(input.leadSource, createdAt);
  const { assignedTo } = await assignLead({
    language: input.language,
    preferredHotelId: input.preferredHotelId,
  });

  const client = createServiceClient();

  const { data: lead, error: leadError } = await client
    .from('leads')
    .insert({
      lead_source: input.leadSource,
      message_from: input.messageFrom ?? input.interactionSource,
      lead_name: input.leadName ?? null,
      lead_phone: leadPhone,
      language: input.language ?? 'tr',
      is_organic: input.isOrganic ?? null,
      source_details: sourceDetails as unknown as Json,
      assigned_to: assignedTo,
      sla_deadline: deadline.toISOString(),
      sla_status: 'on_time',
    })
    .select('uuid')
    .single();

  if (leadError || !lead) {
    throw new Error(`Lead insert failed: ${leadError?.message ?? 'unknown'}`);
  }

  const { error: detailsError } = await client.from('lead_details').insert({
    lead_uuid: lead.uuid,
  });

  if (detailsError) {
    throw new Error(`Lead details insert failed: ${detailsError.message}`);
  }

  const { error: historyError } = await client.from('contact_history').insert({
    lead_uuid: lead.uuid,
    interaction_type: input.leadSource.includes('call') ? 'whatsapp_call' : 'message_received',
    interaction_source: input.interactionSource,
    funnel_status_at_time: 'yeni',
    notes: 'First contact — lead created.',
    metadata: (input.metadata ?? {}) as Json,
  });

  if (historyError) {
    throw new Error(`Contact history insert failed: ${historyError.message}`);
  }

  const collectedRow = await buildCollectedDataRow(
    sourceDetailsToBuildInput(lead.uuid, sourceDetails),
  );
  await persistCollectedData(collectedRow, normalizationFailed ? rawIdentifier : null);

  if (sourceDetails.channel === 'netgsm_call' && sourceDetails.called_number) {
    await incrementDniLeadCount(sourceDetails.called_number);
  }

  if (collectedRow.ref_code) {
    runAfterResponse(enrichFromGA4Immediate(lead.uuid));
  }

  if (assignedTo) {
    await incrementActiveLeadCount(assignedTo);
  } else {
    await sendManagerNotification({
      alertType: 'unassigned_lead',
      leadUuid: lead.uuid,
      message: `[CRM] Unassigned lead created.\nContact: ${leadPhone}\nSource: ${input.leadSource}\nNo agents available in assignment pool.`,
    });

    await client.from('contact_history').insert({
      lead_uuid: lead.uuid,
      interaction_type: 'reassignment',
      interaction_source: input.interactionSource,
      notes: 'Lead created without assignment — pool empty.',
      metadata: { event: 'unassigned_lead' },
    });
  }

  return { type: 'created', uuid: lead.uuid, assignedTo };
}
