/**
 * Lead detail page — full profile, status, contact history, manager actions.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ContactHistorySection } from '@/components/leads/ContactHistorySection';
import { LeadContactFieldsForm } from '@/components/leads/LeadContactFieldsForm';
import { LeadCoreFieldsForm } from '@/components/leads/LeadCoreFieldsForm';
import { LeadDetailsForm } from '@/components/leads/LeadDetailsForm';
import { LeadStatusForm } from '@/components/leads/LeadStatusForm';
import { LeadSummaryCard } from '@/components/leads/LeadSummaryCard';
import { ManagerLeadActions } from '@/components/leads/ManagerLeadActions';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { normalizeLeadDetails } from '@/lib/leads/normalize-lead-details';
import { useAuth } from '@/hooks/useAuth';
import { useSalespeople } from '@/hooks/useSalespeople';
import type { ContactHistoryEntry, LeadDetailRow, LeadWithDetails } from '@/types/domain';

/**
 * Renders full lead detail with editable sections.
 * @returns Lead detail page wrapped in AppShell.
 */
export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [lead, setLead] = useState<LeadWithDetails | null>(null);
  const [details, setDetails] = useState<LeadDetailRow | null>(null);
  const [history, setHistory] = useState<ContactHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLead = useCallback(async () => {
    if (typeof id !== 'string') return;

    setLoading(true);

    const [leadRes, historyRes] = await Promise.all([
      fetch(`/api/leads/${id}`),
      fetch(`/api/contact-history/${id}`),
    ]);

    const leadJson = await leadRes.json();
    const historyJson = await historyRes.json();

    if (leadRes.ok) {
      const leadData = leadJson.data as LeadWithDetails;
      let normalized = normalizeLeadDetails(leadData.lead_details);

      if (!normalized) {
        const detailsRes = await fetch(`/api/lead-details/${id}`);
        const detailsJson = await detailsRes.json();
        if (detailsRes.ok) {
          normalized = normalizeLeadDetails(detailsJson.data);
        }
      }

      setLead(leadData);
      setDetails(normalized);
    }

    if (historyRes.ok) {
      setHistory(historyJson.data);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  if (loading || !lead) {
    return (
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  const leadId = String(id);
  const detailsKey = details?.updated_at ?? details?.lead_uuid ?? leadId;

  return (
    <AppShell>
      <h1>{lead.lead_name ?? lead.lead_phone}</h1>
      <p>
        <Link href={`/tasks?lead_uuid=${leadId}`}>Create task</Link>
      </p>

      <LeadSummaryCard lead={lead} />
      <SourceDetailsPanel sourceDetails={lead.source_details} />
      <LeadContactFieldsForm lead={lead} leadId={leadId} onSaved={loadLead} />
      <LeadCoreFieldsForm lead={lead} leadId={leadId} onSaved={loadLead} />
      <LeadDetailsForm
        key={detailsKey}
        leadId={leadId}
        details={details}
        onSaved={loadLead}
      />
      <LeadStatusForm lead={lead} leadId={leadId} onSaved={loadLead} />

      {user?.role === 'manager' && salespeople && (
        <ManagerLeadActions
          lead={lead}
          leadId={leadId}
          salespeople={salespeople}
          onReassigned={loadLead}
        />
      )}

      <ContactHistorySection leadId={leadId} entries={history} onAdded={loadLead} />
    </AppShell>
  );
}
