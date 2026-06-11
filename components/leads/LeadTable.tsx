/**
 * Lead table component for list view.
 */
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { displayLeadContactIdentifier } from '@/lib/ui/display-phone';
import { cn } from '@/lib/utils';

interface LeadTableProps {
  leads: LeadWithDetails[];
  selectedId?: string;
  onRowClick?: (uuid: string) => void;
  hideAssignee?: boolean;
  renderRowActions?: (lead: LeadWithDetails) => React.ReactNode;
}

/**
 * Resolves assignee display name from row join or flat field.
 * @param lead - Lead row from API.
 * @param emDash - Localized empty placeholder.
 * @returns Assignee name or em dash.
 */
function assigneeLabel(lead: LeadWithDetails, emDash: string): string {
  if (lead.assignee_name) return lead.assignee_name;
  if (lead.salespeople?.full_name) return lead.salespeople.full_name;
  return emDash;
}

/**
 * Reads nested lead_details from a list row.
 * @param lead - Lead row from API.
 * @returns Parsed lead details or null.
 */
function leadDetails(lead: LeadWithDetails): LeadDetailRow | null {
  const details = lead.lead_details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  return details as LeadDetailRow;
}

/**
 * Renders a table of leads with row selection and status badges.
 * @param props - Array of lead rows to display.
 * @returns Lead table element.
 */
export function LeadTable({
  leads,
  selectedId,
  onRowClick,
  hideAssignee,
  renderRowActions,
}: LeadTableProps) {
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');

  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">{t('leads.noLeadsFound')}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>{t('leads.tableNameContact')}</TableHead>
            <TableHead>{t('leads.tableSource')}</TableHead>
            <TableHead>{t('leads.tableFunnelStatus')}</TableHead>
            <TableHead>{t('leads.tableStudentStage')}</TableHead>
            {!hideAssignee && <TableHead>{t('leads.assignee')}</TableHead>}
            <TableHead>{t('leads.schoolShortname')}</TableHead>
            <TableHead>{t('leads.schoolYear')}</TableHead>
            {renderRowActions && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const selected = selectedId === lead.uuid;
            const details = leadDetails(lead);
            return (
              <TableRow
                key={lead.uuid}
                data-state={selected ? 'selected' : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(lead.uuid)}
              >
                <TableCell>
                  <div className={cn('font-medium', selected && 'text-brand-blue')}>
                    {lead.lead_name ?? emDash}
                  </div>
                  {lead.deal_awaiting && (
                    <div className="text-xs font-semibold text-red-600">DEAL AWAITING</div>
                  )}
                  <div className="text-xs text-text-secondary">
                    {displayLeadContactIdentifier(lead)}
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatEnumLabel(locale, 'source', lead.lead_source)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.funnel_status} type="funnel" />
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatEnumLabel(locale, 'stage', lead.student_stage)}
                </TableCell>
                {!hideAssignee && (
                  <TableCell className="text-text-secondary">
                    {assigneeLabel(lead, emDash)}
                  </TableCell>
                )}
                <TableCell className="text-text-secondary">
                  {details?.school_shortname ?? emDash}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {details?.uni_year
                    ? formatEnumLabel(locale, 'uniYear', details.uni_year)
                    : emDash}
                </TableCell>
                {renderRowActions && (
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                    {renderRowActions(lead)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
