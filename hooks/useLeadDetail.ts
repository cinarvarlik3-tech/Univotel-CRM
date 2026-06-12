/**
 * Hook for fetching lead detail, profile details, and contact history.
 */
import { useCallback, useEffect, useState } from 'react';
import { normalizeLeadDetails } from '@/lib/leads/normalize-lead-details';
import type { ContactHistoryEntry, LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface UseLeadDetailResult {
  lead: LeadWithDetails | null;
  details: LeadDetailRow | null;
  history: ContactHistoryEntry[];
  /** Days the lead has been in its current stage (from lead_stage_history, §1.6). */
  timeInStageDays: number | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  applyLeadPatch: (data: Partial<LeadWithDetails>) => void;
  applyDetailsPatch: (data: LeadDetailRow) => void;
}

/**
 * Loads lead detail data for a given UUID.
 * @param leadId - Lead UUID or undefined when panel is closed.
 * @returns Lead data, loading state, and reload function.
 */
export function useLeadDetail(leadId: string | undefined): UseLeadDetailResult {
  const [lead, setLead] = useState<LeadWithDetails | null>(null);
  const [details, setDetails] = useState<LeadDetailRow | null>(null);
  const [history, setHistory] = useState<ContactHistoryEntry[]>([]);
  const [timeInStageDays, setTimeInStageDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!leadId) {
      setLead(null);
      setDetails(null);
      setHistory([]);
      setTimeInStageDays(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [leadRes, historyRes, funnelRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`),
        fetch(`/api/contact-history/${leadId}`),
        fetch(`/api/leads/${leadId}/funnel-view`),
      ]);

      const leadJson = await leadRes.json();
      const historyJson = await historyRes.json();

      if (!leadRes.ok) {
        setError(leadJson.error ?? 'Failed to load lead');
        setLead(null);
        setDetails(null);
        setHistory([]);
        setTimeInStageDays(null);
        return;
      }

      const leadData = leadJson.data as LeadWithDetails;
      let normalized = normalizeLeadDetails(leadData.lead_details);

      if (!normalized) {
        const detailsRes = await fetch(`/api/lead-details/${leadId}`);
        const detailsJson = await detailsRes.json();
        if (detailsRes.ok) {
          normalized = normalizeLeadDetails(detailsJson.data);
        }
      }

      setLead(leadData);
      setDetails(normalized);
      setHistory(historyRes.ok ? historyJson.data : []);

      if (funnelRes.ok) {
        const funnelJson = await funnelRes.json();
        setTimeInStageDays(funnelJson.data?.pipeline?.time_in_stage_days ?? null);
      }
    } catch {
      setError('Failed to load lead');
      setLead(null);
      setDetails(null);
      setHistory([]);
      setTimeInStageDays(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function applyLeadPatch(data: Partial<LeadWithDetails>) {
    setLead((prev) => (prev ? { ...prev, ...data } : prev));
  }

  function applyDetailsPatch(data: LeadDetailRow) {
    setDetails(data);
  }

  return {
    lead,
    details,
    history,
    timeInStageDays,
    loading,
    error,
    reload,
    applyLeadPatch,
    applyDetailsPatch,
  };
}
