/**
 * ref_sessions persistence for REF → UTM lookup at webhook time.
 */
import { generateRefCode, isValidRefCodeFormat } from '@/lib/ref/generate-ref-code';
import { createServiceClient } from '@/lib/supabase/service';

/** Input for creating a ref_sessions row from GTM query params. */
export interface CreateRefSessionInput {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referral_domain?: string | null;
}

/** Stored ref_sessions row shape. */
export interface RefSessionRow {
  ref_code: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referral_domain: string | null;
  created_at: string;
}

const MAX_COLLISION_RETRIES = 8;

/**
 * Normalizes optional query param to trimmed string or null.
 * @param value - Raw query value.
 * @returns Trimmed string or null.
 */
function normalizeQueryValue(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses GTM query params into ref_sessions insert payload fields.
 * @param query - Next.js query object from /api/ref/generate.
 * @returns Normalized ref session field values.
 */
export function parseRefSessionQuery(
  query: Record<string, string | string[] | undefined>,
): CreateRefSessionInput {
  return {
    utm_source: normalizeQueryValue(query.utm_source),
    utm_medium: normalizeQueryValue(query.utm_medium),
    utm_campaign: normalizeQueryValue(query.utm_campaign),
    utm_content: normalizeQueryValue(query.utm_content),
    landing_page: normalizeQueryValue(query.landing_page),
    referral_domain: normalizeQueryValue(query.referral_domain),
  };
}

/**
 * Creates a unique ref_sessions row and returns the generated REF code.
 * @param input - UTM and landing page values from GTM.
 * @returns Newly created ref_sessions row.
 */
export async function createRefSession(input: CreateRefSessionInput): Promise<RefSessionRow> {
  const client = createServiceClient();

  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
    const refCode = generateRefCode();
    if (!isValidRefCodeFormat(refCode)) continue;

    const { data, error } = await client
      .from('ref_sessions')
      .insert({
        ref_code: refCode,
        utm_source: input.utm_source ?? null,
        utm_medium: input.utm_medium ?? null,
        utm_campaign: input.utm_campaign ?? null,
        utm_content: input.utm_content ?? null,
        landing_page: input.landing_page ?? null,
        referral_domain: input.referral_domain ?? null,
      })
      .select('*')
      .single();

    if (!error && data) {
      return data as RefSessionRow;
    }

    if (error?.code !== '23505') {
      throw new Error(`ref_sessions insert failed: ${error?.message ?? 'unknown'}`);
    }
  }

  throw new Error('Failed to generate unique REF code');
}

/**
 * Loads a ref_sessions row by REF code.
 * @param refCode - REF code from webhook payload.
 * @returns Matching row or null when not found.
 */
export async function lookupRefSession(refCode: string): Promise<RefSessionRow | null> {
  if (!isValidRefCodeFormat(refCode)) return null;

  const client = createServiceClient();
  const { data, error } = await client
    .from('ref_sessions')
    .select('*')
    .eq('ref_code', refCode)
    .maybeSingle();

  if (error) {
    throw new Error(`ref_sessions lookup failed: ${error.message}`);
  }

  return (data as RefSessionRow | null) ?? null;
}
