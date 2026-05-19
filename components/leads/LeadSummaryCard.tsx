/**
 * Read-only summary card for lead detail page.
 */
import type { LeadWithDetails } from '@/types/domain';

interface LeadSummaryCardProps {
  lead: LeadWithDetails;
}

/**
 * Renders read-only lead summary fields.
 * @param props - Lead with joined data.
 * @returns Summary card element.
 */
export function LeadSummaryCard({ lead }: LeadSummaryCardProps) {
  const assignee =
    lead.salespeople?.full_name ?? lead.assignee_name ?? 'Unassigned';

  return (
    <div className="card">
      <h3>Summary</h3>
      <dl className="kv">
        <dt>Phone</dt>
        <dd>{lead.lead_phone}</dd>
        {lead.parent_phone && (
          <>
            <dt>Parent phone</dt>
            <dd>{lead.parent_phone}</dd>
          </>
        )}
        <dt>Source</dt>
        <dd>{lead.lead_source}</dd>
        <dt>Channel</dt>
        <dd>{lead.message_from ?? '—'}</dd>
        <dt>Language</dt>
        <dd>{lead.language}</dd>
        <dt>Lead score</dt>
        <dd>{lead.lead_score ?? 0}</dd>
        <dt>Organic</dt>
        <dd>{lead.is_organic == null ? '—' : lead.is_organic ? 'Yes' : 'No'}</dd>
        <dt>Assignee</dt>
        <dd>
          {assignee}
          {lead.salespeople?.email ? ` (${lead.salespeople.email})` : ''}
        </dd>
        <dt>SLA</dt>
        <dd>
          <span className={`badge badge-${lead.sla_status}`}>{lead.sla_status}</span>
          {lead.sla_deadline
            ? ` — ${new Date(lead.sla_deadline).toLocaleString('tr-TR')}`
            : ''}
        </dd>
        <dt>Funnel</dt>
        <dd>{lead.funnel_status}</dd>
        {lead.loss_reason && (
          <>
            <dt>Loss reason</dt>
            <dd>{lead.loss_reason}</dd>
          </>
        )}
        <dt>Student stage</dt>
        <dd>{lead.student_stage}</dd>
        <dt>Persona</dt>
        <dd>{lead.persona_type ?? '—'}</dd>
        <dt>Special state</dt>
        <dd>{lead.special_state ?? '—'}</dd>
        {lead.notes && (
          <>
            <dt>Notes</dt>
            <dd>{lead.notes}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
