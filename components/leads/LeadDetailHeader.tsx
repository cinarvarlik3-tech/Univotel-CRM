/**
 * Sticky header for the lead detail slide-over panel.
 */
import Link from 'next/link';
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { displayLeadPhone } from '@/lib/ui/display-phone';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface LeadDetailHeaderProps {
  lead: LeadWithDetails;
  details?: LeadDetailRow | null;
  leadId: string;
  onClose?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

/**
 * Resolves assignee display name from lead row.
 * @param lead - Lead with joined salesperson data.
 * @param unassignedLabel - Localized unassigned fallback.
 * @returns Assignee name or fallback label.
 */
function assigneeLabel(lead: LeadWithDetails, unassignedLabel: string): string {
  return lead.salespeople?.full_name ?? lead.assignee_name ?? unassignedLabel;
}

/**
 * Renders lead name, phone, status badges, and key metadata.
 * @param props - Lead data and UUID.
 * @returns Panel header element.
 */
export function LeadDetailHeader({
  lead,
  details,
  leadId,
  onClose,
  isFullScreen,
  onToggleFullScreen,
}: LeadDetailHeaderProps) {
  const { locale, t } = useTranslation();

  const genderLabel =
    details?.student_gender === 'male'
      ? formatEnumLabel(locale, 'gender', 'male')
      : details?.student_gender === 'female'
        ? formatEnumLabel(locale, 'gender', 'female')
        : null;

  return (
    <div className="relative space-y-2 border-b border-border-default px-5 pb-3 pt-4">
      <div className="absolute right-3 top-3 flex items-center gap-0.5">
        {onToggleFullScreen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onToggleFullScreen}
            aria-label={isFullScreen ? 'Daralt' : 'Tam ekran'}
          >
            {isFullScreen ? (
              <IconArrowsMinimize className="size-4" />
            ) : (
              <IconArrowsMaximize className="size-4" />
            )}
          </Button>
        )}
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
            aria-label={t('leads.closePanel')}
          >
            <IconX className="size-4" />
          </Button>
        )}
      </div>
      <h2 className="font-heading pr-8 text-base font-bold text-text-primary">
        {lead.lead_name ?? t('common.unnamedLead')}
      </h2>
      <p className="font-mono text-sm text-text-primary">{displayLeadPhone(lead)}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {details?.school_shortname && (
          <Badge className="bg-[var(--badge-school-bg)] text-[var(--badge-school-text)]">
            {details.school_shortname}
          </Badge>
        )}
        {details?.uni_year && (
          <Badge className="bg-[var(--badge-year-bg)] text-[var(--badge-year-text)]">
            {formatEnumLabel(locale, 'uniYear', details.uni_year)}
          </Badge>
        )}
        <StatusBadge status={lead.funnel_status} type="funnel" />
        <StatusBadge status={lead.sla_status} type="sla" />
        {genderLabel && <Badge variant="secondary">{genderLabel}</Badge>}
        <span className="text-xs text-text-tertiary">·</span>
        <span className="text-xs text-text-secondary">
          {formatEnumLabel(locale, 'source', lead.lead_source)}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
        <span>
          {t('leads.assignee')}: {assigneeLabel(lead, t('common.unassigned'))}
        </span>
      </div>
      <Link
        href={`/tasks?lead_uuid=${leadId}`}
        className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
      >
        {t('leads.createTask')}
        <IconExternalLink className="size-3" />
      </Link>
    </div>
  );
}
