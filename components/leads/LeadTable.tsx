/**
 * Lead table component for list view.
 */
import Link from 'next/link';
import type { LeadRow } from '@/types/domain';

interface LeadTableProps {
  leads: LeadRow[];
  onRowClick?: (uuid: string) => void;
}

/**
 * Resolves assignee display name from row join or flat field.
 * @param lead - Lead row from API.
 * @returns Assignee name or em dash.
 */
function assigneeLabel(lead: LeadRow): string {
  if (lead.assignee_name) return lead.assignee_name;
  if (lead.salespeople?.full_name) return lead.salespeople.full_name;
  return '—';
}

/**
 * Renders SLA status badge with color class.
 * @param status - SLA status string.
 * @returns Span element with badge class.
 */
function SlaBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

/**
 * Renders a table of leads with links to detail pages.
 * @param props - Array of lead rows to display.
 * @returns HTML table of leads.
 */
export function LeadTable({ leads, onRowClick }: LeadTableProps) {
  if (leads.length === 0) {
    return <p>No leads found.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Phone</th>
          <th>Name</th>
          <th>Source</th>
          <th>Status</th>
          <th>Stage</th>
          <th>Score</th>
          <th>Assignee</th>
          <th>SLA</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr
            key={lead.uuid}
            onClick={() => onRowClick?.(lead.uuid)}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            <td>
              <Link
                href={`/leads/${lead.uuid}`}
                onClick={(e) => e.stopPropagation()}
              >
                {lead.lead_phone}
              </Link>
            </td>
            <td>
              <Link
                href={`/leads/${lead.uuid}`}
                onClick={(e) => e.stopPropagation()}
              >
                {lead.lead_name ?? '—'}
              </Link>
            </td>
            <td>{lead.lead_source}</td>
            <td>{lead.funnel_status}</td>
            <td>{lead.student_stage}</td>
            <td>{lead.lead_score ?? 0}</td>
            <td>{assigneeLabel(lead)}</td>
            <td>
              <SlaBadge status={lead.sla_status} />
            </td>
            <td>{new Date(lead.created_at).toLocaleString('tr-TR')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
