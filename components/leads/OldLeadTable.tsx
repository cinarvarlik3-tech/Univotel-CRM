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
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime } from '@/lib/i18n/format-date';
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
 * @param emDash - Localized empty placeholder.
 * @returns University name or em dash.
 */
function universityLabel(lead: OldLeadRow, emDash: string): string {
  const details = lead.old_lead_details;
  if (Array.isArray(details)) {
    return details[0]?.university ?? emDash;
  }
  return details?.university ?? emDash;
}

/**
 * Resolves assignee display name from row join.
 * @param lead - Old lead row.
 * @param emDash - Localized empty placeholder.
 * @returns Assignee name or em dash.
 */
function assigneeLabel(lead: OldLeadRow, emDash: string): string {
  return lead.salespeople?.full_name ?? emDash;
}

/**
 * Renders old leads import table.
 * @param props - Old lead rows.
 * @returns HTML table.
 */
export function OldLeadTable({ leads, selectedId, onRowClick }: OldLeadTableProps) {
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');

  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">{t('oldLeads.noLeadsFound')}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>{t('leads.name')}</TableHead>
            <TableHead>{t('oldLeads.tablePhoneInstagram')}</TableHead>
            <TableHead>{t('leads.tableSource')}</TableHead>
            <TableHead>{t('oldLeads.tableUniversity')}</TableHead>
            <TableHead>{t('oldLeads.tableFunnel')}</TableHead>
            <TableHead>{t('leads.assignee')}</TableHead>
            <TableHead>{t('oldLeads.tableCreated')}</TableHead>
            <TableHead>{t('oldLeads.tableLastContact')}</TableHead>
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
                  {lead.lead_name ?? emDash}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {displayLeadContactIdentifier(lead)}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatEnumLabel(locale, 'source', lead.lead_source)}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {universityLabel(lead, emDash)}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatEnumLabel(locale, 'funnel', lead.funnel_status)}
                </TableCell>
                <TableCell className="text-text-secondary">{assigneeLabel(lead, emDash)}</TableCell>
                <TableCell className="text-text-secondary">
                  {formatDateTime(lead.created_at, locale)}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatDateTime(lead.last_contact_at, locale) || emDash}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
