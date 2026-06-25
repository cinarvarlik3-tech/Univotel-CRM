/**
 * NetGSM / Netsantral webhook processor.
 * Supports CDR (arayan, aranan, sure, kimlik) and santral-dinleme aliases per official docs.
 *
 * CDR akışı:
 *   1. Arayan veya aranan numara şirket hattına eşleşiyorsa lead bul (arşivlenmiş dahil).
 *   2. Lead bulunursa contact_history'e CDR kaydı yaz — lead yaratma akışına geçme.
 *   3. Arşivlenmiş lead bulunursa önce unarchive et, sonra CDR'ı yaz.
 *   4. Numara hiçbir lead'e ait değilse mevcut lead yaratma akışına devret.
 */
import { createLeadFromWebhook } from '@/lib/leads/create-lead';
import { buildNetGsmSourceDetails } from '@/lib/leads/source-details';
import { normalizePhone } from '@/lib/leads/normalize-phone';
import { normalizeNetGsmPayload } from '@/lib/webhooks/normalize-netgsm-payload';
import type { NormalizedNetGsm } from '@/lib/webhooks/normalize-netgsm-payload';
import { verifyNetGsmToken } from '@/lib/webhooks/verify';
import {
  COMPANY_PHONE_NUMBER_NORMALIZED,
  ISTANBUL_TIMEZONE,
  isFunnelAdvanceAllowed,
} from '@/lib/constants';
import { NetGsmPayloadSchema } from '@/types/webhooks';
import { createServiceClient } from '@/lib/supabase/service';
import { updateLeadRecord } from '@/lib/leads/update-lead';
import {
  dropped,
  ignored,
  ok,
  partial,
  rejected,
  type WebhookOutcome,
} from '@/lib/webhooks/webhook-outcome';

// ---------------------------------------------------------------------------
// Lead lookup helpers
// ---------------------------------------------------------------------------

interface LeadRow {
  uuid: string;
  lead_name: string | null;
  is_archived: boolean;
  funnel_status: string;
  assigned_to: string | null;
  loss_reason: string | null;
  funnel_status_before_lost: string | null;
}

/**
 * Arşivlenmiş leadler dahil normalize edilmiş telefon numarasına göre lead arar.
 * CDR'da numara eşleşmesi öncelikli olduğundan is_archived filtresi uygulanmaz.
 * @param normalizedPhone - 05xxxxxxxxx veya 0xxxxxxxxxx formatında numara.
 * @returns Lead satırı veya null.
 */
async function findLeadByPhone(normalizedPhone: string): Promise<LeadRow | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('leads')
    .select(
      'uuid, lead_name, is_archived, funnel_status, assigned_to, loss_reason, funnel_status_before_lost',
    )
    .eq('lead_phone', normalizedPhone)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[netgsm] lead lookup by phone failed:', error.message);
    return null;
  }

  return data ?? null;
}

// ---------------------------------------------------------------------------
// CDR note formatting
// ---------------------------------------------------------------------------

/**
 * CDR kaydı için Türkçe not metni oluşturur.
 * Format: "dd/mm/yyyy HH.mm'de arandı/aradı — 3 dk 22 sn" (Istanbul timezone)
 * @param date - Çağrı zamanı.
 * @param direction - 'inbound' | 'outbound'.
 * @param durationSeconds - Çağrı süresi saniye cinsinden.
 * @returns Biçimlendirilmiş not metni.
 */
function formatCdrNote(
  date: Date,
  direction: 'inbound' | 'outbound',
  durationSeconds: number,
): string {
  const opts = (part: Intl.DateTimeFormatOptions) =>
    date.toLocaleString('tr-TR', { timeZone: ISTANBUL_TIMEZONE, ...part });

  const dd = opts({ day: '2-digit' });
  const mm = opts({ month: '2-digit' });
  const yyyy = opts({ year: 'numeric' });
  const HH = opts({ hour: '2-digit', hour12: false });
  const min = opts({ minute: '2-digit' }).padStart(2, '0');

  const datePart = `${dd}/${mm}/${yyyy} ${HH}.${min}`;
  const verb = direction === 'outbound' ? 'arandı' : 'aradı';

  if (durationSeconds <= 0) {
    return `${datePart}'de ${verb} — cevapsız`;
  }

  const dk = Math.floor(durationSeconds / 60);
  const sn = durationSeconds % 60;
  const durPart = dk > 0 ? `${dk} dk ${sn} sn` : `${sn} sn`;
  return `${datePart}'de ${verb} — ${durPart}`;
}

// ---------------------------------------------------------------------------
// contact_history CDR writer
// ---------------------------------------------------------------------------

/**
 * CDR verisini contact_history'e yazar ve last_contact_at'i günceller.
 * Hata durumunda throw etmez, sadece loglar.
 * @param params - Lead UUID, yön, süreler ve normalize edilmiş numaralar.
 */
async function writeCdrToContactHistory(params: {
  leadUuid: string;
  normalized: NormalizedNetGsm;
  direction: 'inbound' | 'outbound';
  callerNorm: string;
  calleeNorm: string;
}): Promise<boolean> {
  const duration = params.normalized.durationSeconds ?? 0;
  const callTime = new Date(); // CDR payload'da timestamp yok — webhook alım zamanı kullanılır
  const formattedText = formatCdrNote(callTime, params.direction, duration);

  const client = createServiceClient();
  const { error } = await client.from('contact_history').insert({
    lead_uuid: params.leadUuid,
    interaction_type: 'call',
    interaction_source: 'netgsm',
    notes: formattedText,
    metadata: {
      direction: params.direction,
      duration_seconds: duration,
      caller: params.callerNorm,
      callee: params.calleeNorm,
    },
    salesperson_id: null,
    status_changed: false,
  });

  if (error) {
    console.error(
      `[netgsm] contact_history CDR insert failed lead=${params.leadUuid}:`,
      error.message,
    );
    return false;
  }

  console.info(
    `[netgsm] contact_history CDR written lead=${params.leadUuid} direction=${params.direction} duration=${duration}s`,
  );

  // Bump last_contact_at so the last-contact sort and recency pill stay accurate.
  const { error: touchError } = await client
    .from('leads')
    .update({ last_contact_at: callTime.toISOString() })
    .eq('uuid', params.leadUuid);

  if (touchError) {
    console.error(
      `[netgsm] last_contact_at update failed lead=${params.leadUuid}:`,
      touchError.message,
    );
  }

  return true;
}

// ---------------------------------------------------------------------------
// CDR auto-advance helpers (D19, D20, §4.4)
// ---------------------------------------------------------------------------

/**
 * Returns the target funnel_status for CDR auto-advance.
 * D19 mapping:
 *   inbound + answered  → bizi-aradi-konustuk
 *   outbound + answered → arandi
 *   outbound + missed   → arandi-acmadi
 *   inbound + missed    → aranacak
 */
function cdrTargetStage(direction: 'inbound' | 'outbound', durationSeconds: number): string {
  const answered = (durationSeconds ?? 0) > 0;
  if (direction === 'inbound') return answered ? 'bizi-aradi-konustuk' : 'aranacak';
  return answered ? 'arandi' : 'arandi-acmadi';
}

/**
 * CDR auto-advance: moves lead to the mapped stage via the updateLeadRecord chokepoint.
 * Never copies the process-chatwoot.ts bypass pattern — routes through the chokepoint
 * so lead_stage_history always gets a row.
 * No attribution (salesperson_id unknown from CDR).
 */
async function maybeCdrAutoAdvance(params: {
  lead: LeadRow;
  direction: 'inbound' | 'outbound';
  durationSeconds: number;
}): Promise<void> {
  const { lead, direction, durationSeconds } = params;
  const target = cdrTargetStage(direction, durationSeconds);

  if (!isFunnelAdvanceAllowed(lead.funnel_status, target)) {
    console.info(
      `[netgsm] CDR auto-advance no-op lead=${lead.uuid} current=${lead.funnel_status} target=${target}`,
    );
    return;
  }

  try {
    await updateLeadRecord(
      lead.uuid,
      { funnel_status: target },
      {
        funnel_status: lead.funnel_status,
        assigned_to: lead.assigned_to,
        loss_reason: lead.loss_reason,
        funnel_status_before_lost: lead.funnel_status_before_lost,
      },
      null, // changedBy — no attribution for CDR auto-advance
      'netgsm', // source
    );
    console.info(
      `[netgsm] CDR auto-advance applied lead=${lead.uuid} ${lead.funnel_status}→${target}`,
    );
  } catch (err) {
    console.error(
      `[netgsm] CDR auto-advance failed lead=${lead.uuid}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------------------------------------------------------------------------
// Unarchive helper
// ---------------------------------------------------------------------------

/**
 * Arşivlenmiş bir lead'i unarchive eder (CDR tetiklemeli, manager_uuid null).
 * unarchive_single_lead SQL fonksiyonunu çağırır — migration 0049'da DEFAULT NULL eklendi.
 * @param leadUuid - Arşivden çıkarılacak lead UUID.
 */
async function unarchiveLeadForCdr(leadUuid: string): Promise<void> {
  const client = createServiceClient();
  const { error } = await client.rpc('unarchive_single_lead', {
    target_uuid: leadUuid,
    manager_uuid: undefined,
  });

  if (error) {
    console.error(`[netgsm] unarchive_single_lead failed lead=${leadUuid}:`, error.message);
    throw new Error(`unarchive failed: ${error.message}`);
  }

  console.info(`[netgsm] lead unarchived via CDR lead=${leadUuid}`);
}

// ---------------------------------------------------------------------------
// Main CDR handler
// ---------------------------------------------------------------------------

/** National 10-digit core of the company line, derived from the constant (e.g. '2129095244'). */
const COMPANY_NUMBER_CORE = COMPANY_PHONE_NUMBER_NORMALIZED.replace(/\D/g, '').replace(/^0+/, '');

/**
 * True when a raw phone is the company line in ANY format:
 * '02129095244', '2129095244', '+902129095244', '+90 212 909 52 44', '0 212 909 52 44', etc.
 * Compares the national 10-digit core after stripping non-digits, leading zeros, and a '90' country code.
 * @param raw - Raw phone string from the CDR payload.
 * @returns True if the number is the company line.
 */
function isCompanyNumber(raw: string | null | undefined): boolean {
  let core = (raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (core.startsWith('90') && core.length === 12) core = core.slice(2);
  return core === COMPANY_NUMBER_CORE;
}

/**
 * Processes a CDR per the tracking rule: a call is recorded ONLY when the company
 * number is the caller or the called party. The other leg is the customer — match
 * it to an existing lead (write CDR) or create a new lead. Calls that don't involve
 * the company number (e.g. a customer dialing a staff personal line that rides the
 * same santral) are ignored, since there's no reliable signal they're business calls.
 * @param normalized - Normalized NetGSM payload.
 * @returns Structured webhook outcome.
 */
async function handleCdr(normalized: NormalizedNetGsm): Promise<WebhookOutcome> {
  const callerIsCompany = isCompanyNumber(normalized.callerPhone);
  const calleeIsCompany = isCompanyNumber(normalized.calledNumber);

  if (!callerIsCompany && !calleeIsCompany) {
    const detail = `Company number not a leg (caller=${normalized.callerPhone ?? 'n/a'} callee=${normalized.calledNumber ?? 'n/a'})`;
    console.info(`[netgsm] CDR ignored — ${detail}`);
    return ignored('not_company_line', detail);
  }

  // Customer = the non-company leg. Company as caller → outbound; company as callee → inbound.
  const customerRaw = callerIsCompany ? normalized.calledNumber : normalized.callerPhone;
  const direction: 'inbound' | 'outbound' = callerIsCompany ? 'outbound' : 'inbound';

  if (!customerRaw) {
    console.warn('[netgsm] CDR has a company leg but no customer number — skipping');
    return dropped('missing_customer', 'CDR has a company leg but no customer number');
  }

  const customerNorm = normalizePhone(customerRaw).phone;
  const callerNorm = normalizePhone(normalized.callerPhone ?? '').phone;
  const calleeNorm = normalizePhone(normalized.calledNumber ?? '').phone;

  const lead = await findLeadByPhone(customerNorm);

  if (lead) {
    // Arşivlenmiş lead ise önce unarchive et
    if (lead.is_archived) {
      try {
        await unarchiveLeadForCdr(lead.uuid);
      } catch {
        // unarchive başarısız olsa bile CDR'ı yazmayı dene
        console.warn(`[netgsm] unarchive failed for lead=${lead.uuid} — continuing CDR write`);
      }
    }

    const written = await writeCdrToContactHistory({
      leadUuid: lead.uuid,
      normalized,
      direction,
      callerNorm,
      calleeNorm,
    });

    // CDR auto-advance: forward-only stage advancement via chokepoint (D19, D20).
    await maybeCdrAutoAdvance({
      lead,
      direction,
      durationSeconds: normalized.durationSeconds ?? 0,
    });

    return written
      ? ok('cdr_written', `${direction} call written to lead=${lead.uuid}`)
      : partial('cdr_write_failed', `contact_history insert failed for lead=${lead.uuid}`);
  }

  // No matching lead → create one from the customer number.
  const externalId = normalized.externalId ?? `netgsm_${Date.now()}`;
  const sourceDetails = buildNetGsmSourceDetails(
    {
      externalId,
      calledNumber: normalized.calledNumber,
      callDuration: normalized.durationSeconds,
    },
    false,
  );

  await createLeadFromWebhook({
    identifierKind: 'phone',
    rawPhone: customerRaw,
    leadSource: 'netgsm_call',
    messageFrom: 'netgsm',
    sourceDetails,
    interactionSource: 'netgsm',
    metadata: {
      scenario: normalized.scenario,
      netgsm_id: externalId,
    },
  });

  return ok('lead_created', `New lead from ${direction} call ${customerNorm}`);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Processes a NetGSM webhook payload into a lead when scenario indicates a completed call.
 * @param body - Raw webhook body (unknown until validated).
 */
export async function processNetGsm(body: unknown): Promise<WebhookOutcome> {
  const parsed = NetGsmPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[netgsm] invalid payload:', parsed.error.flatten());
    return rejected('schema_invalid', parsed.error.message);
  }

  const record = parsed.data as Record<string, unknown>;
  const normalized = normalizeNetGsmPayload(record);

  if (normalized.token && !verifyNetGsmToken(normalized.token)) {
    console.error('[netgsm] token mismatch');
    return rejected('token_mismatch', 'NetGSM token did not match');
  }

  if (!normalized.shouldCreateLead) {
    console.log(
      `[netgsm] skipped lead ingest scenario=${normalized.scenario ?? 'unknown'} id=${normalized.externalId ?? 'n/a'}`,
    );
    return ignored('incomplete_call', `scenario=${normalized.scenario ?? 'unknown'}`);
  }

  if (!normalized.callerPhone) {
    console.error('[netgsm] missing caller phone in CDR payload');
    return rejected('missing_caller', `scenario=${normalized.scenario ?? 'unknown'}`);
  }

  // CDR tracking rule: record only when the company number is a leg; the other
  // leg is the customer (match → write CDR, no match → create lead).
  const outcome = await handleCdr(normalized);
  console.log(
    `[netgsm] CDR ${outcome.status}/${outcome.reasonCode} scenario=${normalized.scenario ?? 'cdr'} id=${normalized.externalId ?? 'n/a'}`,
  );
  return outcome;
}

/**
 * Whether this NetGSM payload should skip lead processing (still logged as skipped).
 * @param body - Parsed webhook JSON.
 * @returns True to skip processor after auth.
 */
export function shouldSkipNetGsmLead(body: unknown): boolean {
  if (!body || typeof body !== 'object') return true;
  const normalized = normalizeNetGsmPayload(body as Record<string, unknown>);
  if (normalized.token && !verifyNetGsmToken(normalized.token)) return true;
  return !normalized.shouldCreateLead;
}
