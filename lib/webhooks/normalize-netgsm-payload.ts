/**
 * Normalizes NetGSM / Netsantral webhook payloads across CDR and santral-dinleme formats.
 * Field names follow official docs (arayan, aranan, sure, kimlik) plus common aliases.
 */

/** Unified NetGSM call fields after alias resolution. */
export interface NormalizedNetGsm {
  token: string | null;
  callerPhone: string | null;
  calledNumber: string | null;
  externalId: string | null;
  durationSeconds: number | null;
  scenario: string | null;
  /** True when payload represents a completed call worth ingesting as a lead. */
  shouldCreateLead: boolean;
}

/**
 * Picks the first non-empty string from a record for the given keys.
 * @param record - Source object.
 * @param keys - Candidate field names.
 * @returns Trimmed string or null.
 */
function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/**
 * Parses duration from string or number fields.
 * @param record - Source object.
 * @param keys - Duration field names.
 * @returns Seconds or null.
 */
function pickDuration(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
    }
  }
  return null;
}

/**
 * Flattens nested AutomaticCall-style { body: { ... } } payloads.
 * @param record - Root webhook JSON object.
 * @returns Merged flat record for field lookup.
 */
function flattenNetGsmRecord(record: Record<string, unknown>): Record<string, unknown> {
  const nested = record.body;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...record, ...(nested as Record<string, unknown>) };
  }
  return record;
}

/**
 * Resolves caller phone based on scenario (CDR vs santral dinleme).
 * @param flat - Flattened payload record.
 * @param scenarioLower - Lowercase scenario string.
 * @returns Caller phone or null.
 */
function resolveCallerPhone(
  flat: Record<string, unknown>,
  scenarioLower: string | null,
): string | null {
  const arayan = pickString(flat, ['arayan', 'arayan_no', 'caller_num', 'source']);
  if (arayan) return arayan;

  const customerNum = pickString(flat, ['customer_num', 'called']);
  if (!customerNum) return null;

  if (
    scenarioLower?.includes('inbound') ||
    scenarioLower === 'cdr' ||
    scenarioLower?.includes('hangup')
  ) {
    return customerNum;
  }

  if (scenarioLower?.includes('outbound')) {
    return customerNum;
  }

  return customerNum;
}

/**
 * Normalizes a NetGSM webhook JSON body into consistent fields.
 * @param record - Raw parsed JSON object.
 * @returns Normalized call metadata.
 */
export function normalizeNetGsmPayload(record: Record<string, unknown>): NormalizedNetGsm {
  const flat = flattenNetGsmRecord(record);
  const scenario = pickString(flat, ['scenario', 'Scenario']);
  const scenarioLower = scenario?.toLowerCase() ?? null;

  const token = pickString(flat, ['token', 'TOKEN']);
  const callerPhone = resolveCallerPhone(flat, scenarioLower);
  const calledNumber = pickString(flat, [
    'aranan',
    'aranan_no',
    'called_num',
    'destination',
    'incoming_number',
    'trunk',
  ]);
  const externalId = pickString(flat, [
    'arama_id',
    'kimlik',
    'asteriskId',
    'unique_id',
    'uniqueId',
    'crm_id',
    'filter',
  ]);
  const durationSeconds = pickDuration(flat, ['sure', 'talktime', 'holdtime', 'duration']);

  const isCdr = scenarioLower === 'cdr';
  const isHangup =
    scenarioLower === 'hangup' || scenarioLower?.endsWith('hangup') || scenarioLower === 'hangup';
  const hasCallOutcome = Boolean(callerPhone && (durationSeconds !== null || isCdr || isHangup));

  const shouldCreateLead = isCdr || (hasCallOutcome && Boolean(externalId));

  return {
    token,
    callerPhone,
    calledNumber,
    externalId,
    durationSeconds,
    scenario,
    shouldCreateLead,
  };
}
