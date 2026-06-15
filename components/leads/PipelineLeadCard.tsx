/**
 * Lead card for the pipeline board view.
 */
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { useTranslation } from '@/hooks/useTranslation';
import { displayLeadContactIdentifier } from '@/lib/ui/display-phone';
import { InactiveLeadBadge } from '@/components/leads/InactiveLeadBadge';
import { isIrrelevantLead } from '@/lib/leads/lead-relevance';
import type { LeadDetailRow } from '@/types/domain';
import type { LeadWithDetails } from '@/types/domain';

interface PipelineLeadCardProps {
  lead: LeadWithDetails;
  isSelected: boolean;
  compact?: boolean;
  highlightInactive?: boolean;
  onClick: (uuid: string) => void;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

function assigneeName(lead: LeadWithDetails): string | null {
  if (lead.assignee_name) return lead.assignee_name;
  if (lead.salespeople?.full_name) return lead.salespeople.full_name;
  return null;
}

/** Short single-line funnel labels for use in tag pills. */
const FUNNEL_SHORT: Record<string, string> = {
  yeni: 'Yeni',
  aranacak: 'Aranacak',
  arandi: 'Arandı',
  'arandi-acmadi': 'Açmadı',
  'bizi-aradi-konustuk': 'Bizi Aradı',
  ziyaret: 'Ziyaret',
  'ziyaret-etmedi': 'Ziy. Etmedi',
  'ziyaret-etti': 'Ziy. Etti',
  'teklif-gonderildi': 'Teklif',
  'kapora-alindi': 'Kapora',
  'sozlesme-imzalandi': 'Sözleşme',
  lost: 'Kayıp',
};

const FUNNEL_VARIANT: Record<string, 'default' | 'call' | 'visit' | 'deal' | 'danger'> = {
  yeni: 'default',
  aranacak: 'call',
  arandi: 'call',
  'arandi-acmadi': 'call',
  'bizi-aradi-konustuk': 'call',
  ziyaret: 'visit',
  'ziyaret-etmedi': 'visit',
  'ziyaret-etti': 'visit',
  'teklif-gonderildi': 'deal',
  'kapora-alindi': 'deal',
  'sozlesme-imzalandi': 'deal',
  lost: 'danger',
};

const TAG_CLS = 'px-1.5 py-px text-[9px] leading-tight rounded-full';

/**
 * Renders a lead card for the kanban pipeline board.
 * In compact mode only name + days are shown to fit all columns on screen.
 */
export function PipelineLeadCard({
  lead,
  isSelected,
  compact = false,
  highlightInactive = false,
  onClick,
}: PipelineLeadCardProps) {
  const { locale, t } = useTranslation();
  const days = daysSince(lead.created_at);
  const assignee = assigneeName(lead);
  const contact = displayLeadContactIdentifier(lead);
  const sourceLabel = formatEnumLabel(locale, 'source', lead.lead_source);

  // lead_details is returned by the pipeline API as a nested object
  const details = lead.lead_details as LeadDetailRow | null | undefined;
  const school = details?.school_shortname || null;
  const uniYear = details?.uni_year ?? null;
  const studentStage =
    lead.student_stage && lead.student_stage !== 'unknown' ? lead.student_stage : null;

  const funnelLabel =
    FUNNEL_SHORT[lead.funnel_status] ?? formatEnumLabel(locale, 'funnel', lead.funnel_status);
  const funnelVariant = FUNNEL_VARIANT[lead.funnel_status] ?? 'default';

  const showInactive = highlightInactive && isIrrelevantLead(lead);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onClick(lead.uuid)}
        className={cn(
          'w-full rounded border bg-surface-card px-1.5 py-1 text-left transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue',
          isSelected
            ? 'border-brand-blue ring-1 ring-brand-blue'
            : 'border-border-default hover:border-border-strong',
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              'truncate text-[10px] font-semibold leading-tight',
              isSelected ? 'text-brand-blue' : 'text-text-primary',
            )}
          >
            {lead.lead_name ?? t('common.emDash')}
            {showInactive && (
              <>
                {' '}
                <InactiveLeadBadge className="inline" />
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            <span className="text-[9px] text-text-tertiary">{days}g</span>
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(lead.uuid)}
      className={cn(
        'w-full rounded-lg border bg-surface-card p-3 text-left transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue',
        isSelected
          ? 'border-brand-blue ring-1 ring-brand-blue'
          : 'border-border-default hover:border-border-strong',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            'truncate text-sm font-semibold leading-tight',
            isSelected ? 'text-brand-blue' : 'text-text-primary',
          )}
        >
          {lead.lead_name ?? t('common.emDash')}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {showInactive && <InactiveLeadBadge />}
        </div>
      </div>

      {/* Contact identifier */}
      <p className="mt-0.5 truncate text-xs text-text-secondary">{contact}</p>

      {/* Source + days */}
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="truncate rounded bg-surface-page px-1.5 py-0.5 text-[10px] text-text-secondary">
          {sourceLabel}
        </span>
        <span className="shrink-0 text-[10px] text-text-tertiary">{days}g</span>
      </div>

      {/* Info tags: funnel stage, student stage, school, uni year */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge variant={funnelVariant} className={TAG_CLS}>
          {funnelLabel}
        </Badge>
        {studentStage && (
          <Badge variant="secondary" className={TAG_CLS}>
            {formatEnumLabel(locale, 'stage', studentStage)}
          </Badge>
        )}
        {school && (
          <Badge variant="secondary" className={TAG_CLS}>
            {school}
          </Badge>
        )}
        {uniYear && (
          <Badge variant="secondary" className={TAG_CLS}>
            {formatEnumLabel(locale, 'uniYear', uniYear)}
          </Badge>
        )}
      </div>

      {/* Assignee */}
      {assignee && <p className="mt-1 truncate text-[10px] text-text-tertiary">{assignee}</p>}
    </button>
  );
}
