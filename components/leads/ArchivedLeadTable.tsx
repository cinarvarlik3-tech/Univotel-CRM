/**
 * Archived lead table for manager list view.
 */
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { displayLeadPhone } from '@/lib/ui/display-phone';
import { cn } from '@/lib/utils';
import type { ArchivedLeadRow } from '@/types/domain';

interface ArchivedLeadTableProps {
  leads: ArchivedLeadRow[];
  onRowClick?: (uuid: string) => void;
}

/**
 * Formats archive outcome as a badge label.
 * @param reason - won or lost.
 * @returns Display label.
 */
function outcomeLabel(reason: string): string {
  return reason === 'won' ? 'Won' : 'Lost';
}

/**
 * Resolves assignee display name from row join.
 * @param lead - Archived lead row.
 * @returns Assignee name or em dash.
 */
function assigneeLabel(lead: ArchivedLeadRow): string {
  return lead.salespeople?.full_name ?? '—';
}

/**
 * Renders archived leads table with outcome and archive metadata.
 * @param props - Archived lead rows and row click handler.
 * @returns HTML table.
 */
export function ArchivedLeadTable({ leads, onRowClick }: ArchivedLeadTableProps) {
  if (leads.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">No archived leads found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Loss reason</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Archived</TableHead>
            <TableHead>Original created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.uuid}
              onClick={() => onRowClick?.(lead.uuid)}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              <TableCell>
                <Link
                  href={`/leads/archived/${lead.uuid}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-brand-blue hover:underline"
                >
                  {lead.lead_name ?? '—'}
                </Link>
              </TableCell>
              <TableCell className="text-text-secondary">{displayLeadPhone(lead)}</TableCell>
              <TableCell className="text-text-secondary">{lead.lead_source}</TableCell>
              <TableCell>
                <Badge variant={lead.archive_reason === 'won' ? 'success' : 'danger'}>
                  {outcomeLabel(lead.archive_reason)}
                </Badge>
              </TableCell>
              <TableCell className="text-text-secondary">
                {lead.archive_reason === 'lost' ? (lead.loss_reason ?? '—') : '—'}
              </TableCell>
              <TableCell className="text-text-secondary">{assigneeLabel(lead)}</TableCell>
              <TableCell className="text-text-secondary">
                {new Date(lead.archived_at).toLocaleString('tr-TR')}
              </TableCell>
              <TableCell className="text-text-secondary">
                {new Date(lead.created_at).toLocaleString('tr-TR')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
