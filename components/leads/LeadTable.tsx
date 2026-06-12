/**
 * Lead table component for list view.
 * Includes dwell pills (last-contact age + days-in-stage) per D13,
 * channel icon per D26, effective name (display_name) per D12,
 * and pin icon per D1/D7.
 */
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';
import { IconPhone, IconPin, IconPinnedFilled } from '@tabler/icons-react';
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
import { formatRelativeTime } from '@/lib/ui/format-relative-time';
import { effectiveLeadName } from '@/components/leads/LeadDetailHeader';
import { cn } from '@/lib/utils';

interface LeadTableProps {
  leads: LeadWithDetails[];
  selectedId?: string;
  onRowClick?: (uuid: string) => void;
  hideAssignee?: boolean;
  renderRowActions?: (lead: LeadWithDetails) => React.ReactNode;
  /** Pinned lead UUIDs (personal to the current agent). */
  pinnedIds?: string[];
  /** Toggle pin on a lead. */
  onTogglePin?: (uuid: string) => void;
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
  pinnedIds,
  onTogglePin,
}: LeadTableProps) {
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');

  // D1: Pinned leads float to the top of the current agent's view.
  const sorted =
    pinnedIds && pinnedIds.length > 0
      ? [...leads].sort((a, b) => {
          const aPin = pinnedIds.includes(a.uuid) ? 0 : 1;
          const bPin = pinnedIds.includes(b.uuid) ? 0 : 1;
          return aPin - bPin;
        })
      : leads;

  if (sorted.length === 0) {
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
            <TableHead>{t('leads.tableFunnelStatus')}</TableHead>
            {!hideAssignee && <TableHead>{t('leads.assignee')}</TableHead>}
            {renderRowActions && <TableHead />}
            {onTogglePin && <TableHead className="w-8" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((lead) => {
            const selected = selectedId === lead.uuid;
            const isPinned = pinnedIds?.includes(lead.uuid) ?? false;
            const lastContactLabel = lead.last_contact_at
              ? formatRelativeTime(new Date(lead.last_contact_at))
              : null;

            return (
              <TableRow
                key={lead.uuid}
                data-state={selected ? 'selected' : undefined}
                className={cn(onRowClick && 'cursor-pointer', isPinned && 'bg-brand-blue/5')}
                onClick={() => onRowClick?.(lead.uuid)}
              >
                <TableCell>
                  {/* Name row (D12: effective name) */}
                  <div className="flex items-center gap-1.5">
                    <span className={cn('font-medium', selected && 'text-brand-blue')}>
                      {effectiveLeadName(lead) ?? emDash}
                    </span>
                    {/* Channel icon (D26) */}
                    {lead.message_from === 'netgsm' && (
                      <IconPhone className="size-3 shrink-0 text-text-tertiary" />
                    )}
                    {lead.message_from === 'whatsapp' && (
                      <span className="text-[10px] font-bold text-green-600">WA</span>
                    )}
                    {lead.message_from === 'instagram' && (
                      <span className="text-[10px] font-bold text-pink-600">IG</span>
                    )}
                  </div>
                  {/* Deal awaiting: orange (not red) + Turkish (§8.2) */}
                  {lead.deal_awaiting && (
                    <div className="text-xs font-semibold text-orange-600">Anlaşma bekliyor</div>
                  )}
                  <div className="text-xs text-text-secondary">
                    {displayLeadContactIdentifier(lead)}
                  </div>
                  {/* Dwell pills (D13) */}
                  {lastContactLabel && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] text-text-tertiary">
                        {lastContactLabel}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.funnel_status} type="funnel" />
                </TableCell>
                {!hideAssignee && (
                  <TableCell className="text-text-secondary">
                    {assigneeLabel(lead, emDash)}
                  </TableCell>
                )}
                {renderRowActions && (
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                    {renderRowActions(lead)}
                  </TableCell>
                )}
                {/* D7: pin icon — personal & private */}
                {onTogglePin && (
                  <TableCell
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(lead.uuid);
                    }}
                    className="w-8 text-center"
                  >
                    {isPinned ? (
                      <IconPinnedFilled className="size-3.5 text-brand-blue" />
                    ) : (
                      <IconPin className="size-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
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
