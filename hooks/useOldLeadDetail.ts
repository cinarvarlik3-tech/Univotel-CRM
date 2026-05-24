/**
 * Hook for fetching a single old lead with full detail fields.
 */
import { useCallback, useEffect, useState } from 'react';
import type { OldLeadDetailRow, OldLeadDetailsRow } from '@/types/domain';

interface UseOldLeadDetailResult {
  lead: OldLeadDetailRow | null;
  details: OldLeadDetailsRow | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

function normalizeOldLeadDetails(
  raw: OldLeadDetailRow['old_lead_details'],
): OldLeadDetailsRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

/**
 * Loads old lead detail for sidebar panel.
 * @param leadId - Old lead UUID or undefined when panel is closed.
 */
export function useOldLeadDetail(leadId: string | undefined): UseOldLeadDetailResult {
  const [lead, setLead] = useState<OldLeadDetailRow | null>(null);
  const [details, setDetails] = useState<OldLeadDetailsRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!leadId) {
      setLead(null);
      setDetails(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/old-leads/${leadId}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to load old lead');
        setLead(null);
        setDetails(null);
        return;
      }

      const row = json.data.oldLead as OldLeadDetailRow;
      setLead(row);
      setDetails(normalizeOldLeadDetails(row.old_lead_details));
    } catch {
      setError('Failed to load old lead');
      setLead(null);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { lead, details, loading, error, reload };
}
