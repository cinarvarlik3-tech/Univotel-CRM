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
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime } from '@/lib/i18n/format-date';
import { displayLeadPhone } from '@/lib/ui/display-phone';
import { cn } from '@/lib/utils';
import type { ArchivedLeadRow } from '@/types/domain';

interface ArchivedLeadTableProps {
  leads: ArchivedLeadRow[];
  onRowClick?: (uuid: string) => void;
}

/**
 * Resolves assignee display name from row join.
 * @param lead - Archived lead row.
 * @param emDash - Localized empty placeholder.
 * @returns Assignee name or em dash.
 */
function assigneeLabel(lead: ArchivedLeadRow, emDash: string): string {
  return lead.salespeople?.full_name ?? emDash;
}

/**
 * Renders archived leads table with outcome and archive metadata.
 * @param props - Archived lead rows and row click handler.
 * @returns HTML table.
 */
export function ArchivedLeadTable({ leads, onRowClick }: ArchivedLeadTableProps) {
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');

  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">{t('archived.noLeadsFound')}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>{t('archived.tableName')}</TableHead>
            <TableHead>{t('archived.tablePhone')}</TableHead>
            <TableHead>{t('leads.tableSource')}</TableHead>
            <TableHead>{t('archived.tableOutcome')}</TableHead>
            <TableHead>{t('archived.tableLossReason')}</TableHead>
            <TableHead>{t('archived.tableAssignedTo')}</TableHead>
            <TableHead>{t('archived.tableArchived')}</TableHead>
            <TableHead>{t('archived.originalCreated')}</TableHead>
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
                  {lead.lead_name ?? emDash}
                </Link>
              </TableCell>
              <TableCell className="text-text-secondary">{displayLeadPhone(lead)}</TableCell>
              <TableCell className="text-text-secondary">
                {formatEnumLabel(locale, 'source', lead.lead_source)}
              </TableCell>
              <TableCell>
                <Badge variant={lead.archive_reason === 'won' ? 'success' : 'danger'}>
                  {formatEnumLabel(locale, 'archive', lead.archive_reason)}
                </Badge>
              </TableCell>
              <TableCell className="text-text-secondary">
                {lead.archive_reason === 'lost' && lead.loss_reason
                  ? formatEnumLabel(locale, 'loss', lead.loss_reason)
                  : emDash}
              </TableCell>
              <TableCell className="text-text-secondary">{assigneeLabel(lead, emDash)}</TableCell>
              <TableCell className="text-text-secondary">
                {formatDateTime(lead.archived_at, locale)}
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatDateTime(lead.created_at, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
