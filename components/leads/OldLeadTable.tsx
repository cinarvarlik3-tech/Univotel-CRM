/**
 * Read-only table for imported old leads.
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { displayLeadContactIdentifier } from '@/lib/ui/display-phone';
import { cn } from '@/lib/utils';
import type { OldLeadRow } from '@/types/domain';

interface OldLeadTableProps {
  leads: OldLeadRow[];
  selectedId?: string;
  onRowClick?: (uuid: string) => void;
}

/**
 * Resolves university from joined old_lead_details.
 * @param lead - Old lead row.
 * @returns University name or em dash.
 */
function universityLabel(lead: OldLeadRow): string {
  const details = lead.old_lead_details;
  if (Array.isArray(details)) {
    return details[0]?.university ?? '—';
  }
  return details?.university ?? '—';
}

/**
 * Resolves assignee display name from row join.
 * @param lead - Old lead row.
 * @returns Assignee name or em dash.
 */
function assigneeLabel(lead: OldLeadRow): string {
  return lead.salespeople?.full_name ?? '—';
}

/**
 * Renders old leads import table.
 * @param props - Old lead rows.
 * @returns HTML table.
 */
export function OldLeadTable({ leads, selectedId, onRowClick }: OldLeadTableProps) {
  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No old leads found. Import data to populate this list.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Phone / Instagram</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>University</TableHead>
            <TableHead>Funnel</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const selected = selectedId === lead.uuid;
            return (
              <TableRow
                key={lead.uuid}
                data-state={selected ? 'selected' : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(lead.uuid)}
              >
                <TableCell className={cn('font-medium', selected && 'text-brand-blue')}>
                  {lead.lead_name ?? '—'}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {displayLeadContactIdentifier(lead)}
                </TableCell>
                <TableCell className="text-text-secondary">{lead.lead_source}</TableCell>
                <TableCell className="text-text-secondary">{universityLabel(lead)}</TableCell>
                <TableCell className="text-text-secondary">{lead.funnel_status}</TableCell>
                <TableCell className="text-text-secondary">{assigneeLabel(lead)}</TableCell>
                <TableCell className="text-text-secondary">
                  {new Date(lead.created_at).toLocaleString('tr-TR')}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {lead.last_contact_at
                    ? new Date(lead.last_contact_at).toLocaleString('tr-TR')
                    : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
