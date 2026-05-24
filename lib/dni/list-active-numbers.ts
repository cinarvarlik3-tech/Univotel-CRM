/**
 * Public DNI number list and lead_count updates for NetGSM call attribution.
 */
import {
  normalizeVirtualNumberDigits,
  virtualNumberToE164,
  virtualNumbersMatch,
} from '@/lib/dni/normalize-virtual-number';
import { createServiceClient } from '@/lib/supabase/service';

/** Active DNI entry returned to GTM. */
export interface ActiveDniNumber {
  source: string;
  virtual_number: string;
}

/**
 * Loads active DNI numbers for the public /api/dni/numbers endpoint.
 * @returns Active source → virtual_number pairs in E.164 format.
 */
export async function listActiveDniNumbers(): Promise<ActiveDniNumber[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from('dni_numbers')
    .select('source, virtual_number')
    .eq('is_active', true)
    .order('source', { ascending: true });

  if (error) {
    throw new Error(`dni_numbers query failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    source: row.source as string,
    virtual_number: virtualNumberToE164(row.virtual_number as string),
  }));
}

/**
 * Looks up DNI source for a called virtual number.
 * @param calledNumber - Virtual number from NetGSM CDR.
 * @returns Matching dni_numbers row fields or null.
 */
export async function lookupDniSource(calledNumber: string | null | undefined): Promise<{
  source: string;
  display_label: string;
} | null> {
  if (!calledNumber) return null;

  const client = createServiceClient();
  const { data: rows, error } = await client
    .from('dni_numbers')
    .select('source, display_label, virtual_number')
    .eq('is_active', true);

  if (error || !rows) return null;

  const match = rows.find((row) => virtualNumbersMatch(row.virtual_number as string, calledNumber));
  if (!match) return null;

  return {
    source: match.source as string,
    display_label: match.display_label as string,
  };
}

/**
 * Increments lead_count for the DNI row matching called_number.
 * @param calledNumber - Virtual number from NetGSM CDR (aranan_no).
 */
export async function incrementDniLeadCount(
  calledNumber: string | null | undefined,
): Promise<void> {
  if (!calledNumber) return;

  const client = createServiceClient();
  const { data: rows, error } = await client
    .from('dni_numbers')
    .select('id, virtual_number, lead_count')
    .eq('is_active', true);

  if (error || !rows) {
    console.error('[dni] failed to load numbers for lead_count increment:', error?.message);
    return;
  }

  const match = rows.find((row) => virtualNumbersMatch(row.virtual_number as string, calledNumber));
  if (!match) return;

  const nextCount = ((match.lead_count as number | undefined) ?? 0) + 1;
  const { error: incError } = await client
    .from('dni_numbers')
    .update({ lead_count: nextCount, last_lead_at: new Date().toISOString() })
    .eq('id', match.id);

  if (incError) {
    console.error('[dni] lead_count increment failed:', incError.message);
  }
}

export { normalizeVirtualNumberDigits, virtualNumberToE164, virtualNumbersMatch };
