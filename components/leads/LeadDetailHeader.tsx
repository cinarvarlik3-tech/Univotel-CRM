/**
 * Slim persistent identity bar for the lead detail slide-over (§3.1 / D10, D13).
 * Two rows: identity + action buttons (row 1), dwell pills (row 2).
 * SLA pill removed (D16). Per-field provenance name shown muted below display name (D12).
 */
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconCalendarPlus,
  IconCircleCheckFilled,
  IconClockHour4,
  IconPhone,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTranslation } from '@/hooks/useTranslation';
import { displayLeadPhone } from '@/lib/ui/display-phone';
import { formatRelativeTime } from '@/lib/ui/format-relative-time';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface LeadDetailHeaderProps {
  lead: LeadWithDetails;
  details?: LeadDetailRow | null;
  leadId: string;
  timeInStageDays?: number | null;
  onClose?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onScheduleVisit?: () => void;
  onCreateTask?: () => void;
  onLogContact?: () => void;
}

/** Resolves the effective display name per §1.1 read rule. */
export function effectiveLeadName(lead: {
  display_name?: string | null;
  auto_logged_name?: string | null;
  lead_name?: string | null;
}): string | null {
  return lead.display_name ?? lead.auto_logged_name ?? lead.lead_name ?? null;
}

/** Assignee display name from joined data. */
function assigneeLabel(lead: LeadWithDetails, unassignedLabel: string): string {
  return lead.salespeople?.full_name ?? lead.assignee_name ?? unassignedLabel;
}

/** Channel icon (message_from) — small, distinct (D26). */
function ChannelIcon({ messageFrom }: { messageFrom?: string | null }) {
  if (messageFrom === 'whatsapp') {
    return <span className="text-[10px] font-bold text-green-600">WA</span>;
  }
  if (messageFrom === 'instagram') {
    return <span className="text-[10px] font-bold text-pink-600">IG</span>;
  }
  if (messageFrom === 'netgsm') {
    return <IconPhone className="size-3 text-text-tertiary" />;
  }
  return null;
}

/**
 * Slim identity bar for the lead slide-over.
 * Row 1: name · stage pill · assignee · channel icon — close/fullscreen in corner.
 * Row 2: last-contact pill · days-in-stage pill.
 * Header action buttons: Ziyaret Planla + Görev Oluştur (D10 deliberate two-location model).
 */
export function LeadDetailHeader({
  lead,
  leadId,
  timeInStageDays,
  onClose,
  isFullScreen,
  onToggleFullScreen,
  onScheduleVisit,
  onCreateTask,
  onLogContact,
}: LeadDetailHeaderProps) {
  const { t } = useTranslation();

  const displayName = effectiveLeadName(lead);
  const hasRename =
    lead.display_name != null &&
    lead.display_name !== lead.auto_logged_name &&
    lead.display_name !== lead.lead_name;

  const lastContactAt = lead.last_contact_at ?? null;
  const lastContactLabel = lastContactAt ? formatRelativeTime(new Date(lastContactAt)) : null;

  const daysInStageLabel =
    timeInStageDays != null
      ? timeInStageDays === 0
        ? 'Bugün girdi'
        : `${timeInStageDays} gündür ${lead.funnel_status}`
      : null;

  return (
    <div className="relative shrink-0 border-b border-border-default px-5 pb-2.5 pt-3.5">
      {/* Corner controls */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5">
        {onToggleFullScreen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onToggleFullScreen}
            aria-label={isFullScreen ? 'Daralt' : 'Tam ekran'}
          >
            {isFullScreen ? (
              <IconArrowsMinimize className="size-3.5" />
            ) : (
              <IconArrowsMaximize className="size-3.5" />
            )}
          </Button>
        )}
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
            aria-label={t('leads.closePanel')}
          >
            <IconX className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Row 1: name + assignee + stage + channel */}
      <div className="pr-14">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-0.5">
          <h2 className="font-heading text-sm font-bold text-text-primary">
            {displayName ?? t('common.unnamedLead')}
          </h2>
          <StatusBadge status={lead.funnel_status} type="funnel" />
          <ChannelIcon messageFrom={lead.message_from} />
        </div>
        {/* Provenance: show auto_logged original muted when renamed (D12) */}
        {hasRename && (
          <p className="mt-0.5 text-[11px] text-text-tertiary">
            geldiği ad: {lead.auto_logged_name ?? lead.lead_name}
          </p>
        )}
        <p className="font-mono text-[12px] text-text-secondary">{displayLeadPhone(lead)}</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {assigneeLabel(lead, t('common.unassigned'))}
        </p>
      </div>

      {/* Row 2: dwell pills (D13) */}
      {(lastContactLabel || daysInStageLabel) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {lastContactLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] text-text-tertiary">
              <IconClockHour4 className="size-3" />
              {lastContactLabel}
            </span>
          )}
          {daysInStageLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] text-text-tertiary">
              <IconCircleCheckFilled className="size-3" />
              {daysInStageLabel}
            </span>
          )}
        </div>
      )}

      {/* Header action buttons — deliberately in the header (D10 two-location model) */}
      {(onScheduleVisit || onCreateTask || onLogContact) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onScheduleVisit && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={onScheduleVisit}
            >
              <IconCalendarPlus className="mr-1 size-3.5" />
              Ziyaret Planla
            </Button>
          )}
          {onCreateTask && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={onCreateTask}
            >
              Görev Oluştur
            </Button>
          )}
          {onLogContact && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={onLogContact}
            >
              İletişim kaydet
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
