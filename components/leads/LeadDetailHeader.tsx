/**
 * Sticky header for the lead detail slide-over panel.
 */
import Link from 'next/link';
import { IconExternalLink, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { displayLeadPhone } from '@/lib/ui/display-phone';
import type { LeadWithDetails } from '@/types/domain';

interface LeadDetailHeaderProps {
  lead: LeadWithDetails;
  leadId: string;
  onClose?: () => void;
}

/**
 * Resolves assignee display name from lead row.
 * @param lead - Lead with joined salesperson data.
 * @returns Assignee name or fallback label.
 */
function assigneeLabel(lead: LeadWithDetails): string {
  return lead.salespeople?.full_name ?? lead.assignee_name ?? 'Unassigned';
}

/**
 * Renders lead name, phone, status badges, and key metadata.
 * @param props - Lead data and UUID.
 * @returns Panel header element.
 */
export function LeadDetailHeader({ lead, leadId, onClose }: LeadDetailHeaderProps) {
  return (
    <div className="relative space-y-2 border-b border-border-default px-5 pb-3 pt-4">
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 size-8"
          onClick={onClose}
          aria-label="Close panel"
        >
          <IconX className="size-4" />
        </Button>
      )}
      <h2 className="font-heading pr-8 text-base font-bold text-text-primary">
        {lead.lead_name ?? 'Unnamed lead'}
      </h2>
      <p className="font-mono text-sm text-text-primary">{displayLeadPhone(lead)}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={lead.funnel_status} type="funnel" />
        <StatusBadge status={lead.sla_status} type="sla" />
        <span className="text-xs text-text-tertiary">·</span>
        <span className="text-xs text-text-secondary">{lead.lead_source}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
        <span>Assignee: {assigneeLabel(lead)}</span>
        <span>Score: {lead.lead_score ?? 0}</span>
        <span>Stage: {lead.student_stage}</span>
      </div>
      <Link
        href={`/tasks?lead_uuid=${leadId}`}
        className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
      >
        Create task
        <IconExternalLink className="size-3" />
      </Link>
    </div>
  );
}
