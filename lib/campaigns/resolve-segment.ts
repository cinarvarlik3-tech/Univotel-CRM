/**
 * Resolves campaign segment filters to matching lead UUIDs.
 */
import { applyEmbeddedFilters } from '@/lib/query/apply-embedded-filters';
import { applyFilters, type FilterCondition, validateFilters } from '@/lib/query/filter-builder';
import { requiresLeadDetailsJoin, splitFilters } from '@/lib/query/split-filters';
import { createServiceClient } from '@/lib/supabase/service';
import type { CampaignSegment } from '@/types/domain';

/**
 * Validates segment filter fields against whitelist.
 * @param segment - Campaign segment payload.
 * @returns Error message or null if valid.
 */
export function validateCampaignSegment(segment: CampaignSegment): string | null {
  return validateFilters(segment.filters ?? [])?.error ?? null;
}

/**
 * Counts leads matching a campaign segment.
 * @param segment - Segment filter definitions.
 * @param language - Optional language constraint.
 * @returns Matching lead count.
 */
export async function countSegmentLeads(
  segment: CampaignSegment,
  language?: string | null,
): Promise<number> {
  const client = createServiceClient();
  const filters: FilterCondition[] = segment.filters ?? [];
  const { leads: leadFilters, leadDetails: detailsFilters } = splitFilters(filters);
  const needsDetailsJoin = requiresLeadDetailsJoin(filters);

  if (needsDetailsJoin) {
    let query = client
      .from('leads')
      .select('uuid, lead_details!inner(lead_uuid)', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('is_archived', false);
    if (language) query = query.eq('language', language);
    query = applyFilters(query, leadFilters);
    query = applyEmbeddedFilters(query, 'lead_details', detailsFilters);
    const { count, error } = await query;
    if (error) throw new Error(`Segment count failed: ${error.message}`);
    return count ?? 0;
  }

  let query = client
    .from('leads')
    .select('uuid', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .eq('is_archived', false);
  if (language) query = query.eq('language', language);
  query = applyFilters(query, leadFilters);
  const { count, error } = await query;
  if (error) throw new Error(`Segment count failed: ${error.message}`);
  return count ?? 0;
}

/**
 * Returns all lead UUIDs matching a campaign segment.
 * @param segment - Segment filter definitions.
 * @param language - Optional language constraint.
 * @returns Array of lead UUIDs.
 */
export async function resolveSegmentLeadUuids(
  segment: CampaignSegment,
  language?: string | null,
): Promise<string[]> {
  const client = createServiceClient();
  const filters: FilterCondition[] = segment.filters ?? [];
  const { leads: leadFilters, leadDetails: detailsFilters } = splitFilters(filters);
  const needsDetailsJoin = requiresLeadDetailsJoin(filters);

  if (needsDetailsJoin) {
    let query = client
      .from('leads')
      .select('uuid, lead_details!inner(lead_uuid)')
      .eq('is_deleted', false)
      .eq('is_archived', false);
    if (language) query = query.eq('language', language);
    query = applyFilters(query, leadFilters);
    query = applyEmbeddedFilters(query, 'lead_details', detailsFilters);
    const { data, error } = await query;
    if (error) throw new Error(`Segment resolve failed: ${error.message}`);
    return (data ?? []).map((row) => row.uuid);
  }

  let query = client.from('leads').select('uuid').eq('is_deleted', false).eq('is_archived', false);
  if (language) query = query.eq('language', language);
  query = applyFilters(query, leadFilters);
  const { data, error } = await query;
  if (error) throw new Error(`Segment resolve failed: ${error.message}`);
  return (data ?? []).map((row) => row.uuid);
}
