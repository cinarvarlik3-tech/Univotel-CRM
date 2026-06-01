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
import { sendTelegramToManagers } from '@/lib/telegram';
import { COMPANY_PHONE_NUMBER_NORMALIZED, ISTANBUL_TIMEZONE } from '@/lib/constants';
import { NetGsmPayloadSchema } from '@/types/webhooks';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Lead lookup helpers
// ---------------------------------------------------------------------------

interface LeadRow {
  uuid: string;
  lead_name: string | null;
  is_archived: boolean;
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
    .select('uuid, lead_name, is_archived')
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
 * CDR verisini contact_history'e yazar.
 * Hata durumunda throw etmez, sadece loglar.
 * @param params - Lead UUID, yön, süreler ve normalize edilmiş numaralar.
 */
async function writeCdrToContactHistory(params: {
  leadUuid: string;
  normalized: NormalizedNetGsm;
  direction: 'inbound' | 'outbound';
  callerNorm: string;
  calleeNorm: string;
}): Promise<void> {
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
  } else {
    console.info(
      `[netgsm] contact_history CDR written lead=${params.leadUuid} direction=${params.direction} duration=${duration}s`,
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

/**
 * CDR payload'ını işler: şirket hattı tespiti → lead bul → unarchive (gerekirse) → CDR yaz.
 * Eşleşme yoksa false döner, çağıran mevcut lead yaratma akışına devredebilir.
 * @param normalized - Normalize edilmiş NetGSM payload.
 * @returns true eğer CDR bir lead'e eşleşti ve işlendi; false ise lead bulunamadı.
 */
async function handleCdrForExistingLead(normalized: NormalizedNetGsm): Promise<boolean> {
  const callerNorm = normalizePhone(normalized.callerPhone ?? '').phone;
  const calleeNorm = normalizePhone(normalized.calledNumber ?? '').phone;

  const isCompanyCaller = callerNorm === COMPANY_PHONE_NUMBER_NORMALIZED;
  const isCompanyCallee = calleeNorm === COMPANY_PHONE_NUMBER_NORMALIZED;

  if (!isCompanyCaller && !isCompanyCallee) {
    // Şirket hattı yoksa CDR eşleştirmesi yapma, mevcut akışa bırak
    return false;
  }

  const leadPhone = isCompanyCaller ? calleeNorm : callerNorm;
  const direction: 'inbound' | 'outbound' = isCompanyCaller ? 'outbound' : 'inbound';

  const lead = await findLeadByPhone(leadPhone);
  if (!lead) {
    console.info(`[netgsm] CDR: no lead for phone=${leadPhone} — falling through to lead creation`);
    return false;
  }

  // Arşivlenmiş lead ise önce unarchive et
  if (lead.is_archived) {
    try {
      await unarchiveLeadForCdr(lead.uuid);
    } catch {
      // unarchive başarısız olsa bile CDR'ı yazmayı dene
      console.warn(`[netgsm] unarchive failed for lead=${lead.uuid} — continuing CDR write`);
    }
  }

  await writeCdrToContactHistory({
    leadUuid: lead.uuid,
    normalized,
    direction,
    callerNorm,
    calleeNorm,
  });

  return true;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Processes a NetGSM webhook payload into a lead when scenario indicates a completed call.
 * @param body - Raw webhook body (unknown until validated).
 */
export async function processNetGsm(body: unknown): Promise<void> {
  const parsed = NetGsmPayloadSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[netgsm] invalid payload:', parsed.error.flatten());
    await sendTelegramToManagers(
      `[CRM] NetGSM webhook validation failed.\n${parsed.error.message}`,
    );
    return;
  }

  const record = parsed.data as Record<string, unknown>;
  const normalized = normalizeNetGsmPayload(record);

  if (normalized.token && !verifyNetGsmToken(normalized.token)) {
    console.error('[netgsm] token mismatch');
    return;
  }

  if (!normalized.shouldCreateLead) {
    console.log(
      `[netgsm] skipped lead ingest scenario=${normalized.scenario ?? 'unknown'} id=${normalized.externalId ?? 'n/a'}`,
    );
    return;
  }

  if (!normalized.callerPhone) {
    console.error('[netgsm] missing caller phone in CDR payload');
    await sendTelegramToManagers(
      `[CRM] NetGSM CDR missing caller phone.\nScenario: ${normalized.scenario ?? 'unknown'}`,
    );
    return;
  }

  // CDR: şirket hattı tespiti ve mevcut lead eşleştirmesi
  const handled = await handleCdrForExistingLead(normalized);
  if (handled) {
    return; // Mevcut lead'e yazıldı — yeni lead yaratma
  }

  // Eşleşme yoksa mevcut lead yaratma akışı — dokunulmaz
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
    rawPhone: normalized.callerPhone,
    leadSource: 'netgsm_call',
    messageFrom: 'netgsm',
    sourceDetails,
    interactionSource: 'netgsm',
    metadata: {
      scenario: normalized.scenario,
      netgsm_id: externalId,
    },
  });
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
