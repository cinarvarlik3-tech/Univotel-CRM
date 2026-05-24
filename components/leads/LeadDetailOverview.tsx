/**
 * Read-only overview tab content for lead detail panel.
 */
import type { ReactNode } from 'react';
import { KvList } from '@/components/ui/kv-list';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface LeadDetailOverviewProps {
  lead: LeadWithDetails;
  details: LeadDetailRow | null;
}

/**
 * Renders read-only lead overview blocks: notes, dates, attribution.
 * @param props - Lead and detail row data.
 * @returns Overview tab content.
 */
export function LeadDetailOverview({ lead, details }: LeadDetailOverviewProps) {
  const assignee = lead.salespeople?.full_name ?? lead.assignee_name ?? 'Unassigned';

  const metaItems: { term: string; value: ReactNode }[] = [
    {
      term: 'SLA deadline',
      value: lead.sla_deadline ? new Date(lead.sla_deadline).toLocaleString('tr-TR') : '—',
    },
    {
      term: 'Created',
      value: new Date(lead.created_at).toLocaleString('tr-TR'),
    },
    { term: 'Language', value: lead.language },
    { term: 'Channel', value: lead.message_from ?? '—' },
    {
      term: 'Organic',
      value: lead.is_organic == null ? '—' : lead.is_organic ? 'Yes' : 'No',
    },
    { term: 'Assignee', value: assignee },
    { term: 'Persona', value: lead.persona_type ?? '—' },
    { term: 'Special state', value: lead.special_state ?? '—' },
  ];

  if (lead.loss_reason) {
    metaItems.push({ term: 'Loss reason', value: lead.loss_reason });
  }

  if (details?.university) {
    metaItems.push({ term: 'University', value: details.university });
  }

  if (details?.budget_min != null || details?.budget_max != null) {
    metaItems.push({
      term: 'Budget',
      value: `${details?.budget_min ?? '—'} – ${details?.budget_max ?? '—'}`,
    });
  }

  return (
    <div className="space-y-5">
      {lead.notes && (
        <div>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
            Notes
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
            {lead.notes}
          </p>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          Status
        </h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={lead.funnel_status} type="funnel" />
          <StatusBadge status={lead.sla_status} type="sla" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          Details
        </h3>
        <KvList items={metaItems} layout="stacked" />
      </div>

      <SourceDetailsPanel sourceDetails={lead.source_details} embedded />
    </div>
  );
}
