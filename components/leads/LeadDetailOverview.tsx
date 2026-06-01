/**
 * Read-only overview tab content for lead detail panel.
 */
import type { ReactNode } from 'react';
import { KvList } from '@/components/ui/kv-list';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime, formatYesNo } from '@/lib/i18n/format-date';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface LeadDetailOverviewProps {
  lead: LeadWithDetails;
  details: LeadDetailRow | null;
}

/**
 * Renders read-only lead overview blocks: notes, dates, attribution.
 * @param props - Lead and detail row data.
 * @returns Overview tab content.
 */
export function LeadDetailOverview({ lead, details }: LeadDetailOverviewProps) {
  const { locale, t } = useTranslation();
  const assignee = lead.salespeople?.full_name ?? lead.assignee_name ?? t('common.unassigned');

  const metaItems: { term: string; value: ReactNode }[] = [
    {
      term: t('leads.slaDeadline'),
      value: formatDateTime(lead.sla_deadline, locale),
    },
    {
      term: t('leads.created'),
      value: formatDateTime(lead.created_at, locale),
    },
    { term: t('filters.language'), value: formatEnumLabel(locale, 'language', lead.language) },
    {
      term: t('filters.channel'),
      value: lead.message_from
        ? formatEnumLabel(locale, 'channel', lead.message_from)
        : t('common.emDash'),
    },
    {
      term: t('filters.organic'),
      value: formatYesNo(lead.is_organic, locale),
    },
    { term: t('leads.assignee'), value: assignee },
    {
      term: t('filters.persona'),
      value: lead.persona_type
        ? formatEnumLabel(locale, 'persona', lead.persona_type)
        : t('common.emDash'),
    },
    {
      term: t('filters.specialState'),
      value: lead.special_state
        ? formatEnumLabel(locale, 'special', lead.special_state)
        : t('common.emDash'),
    },
  ];

  if (lead.loss_reason) {
    metaItems.push({
      term: t('filters.lossReason'),
      value: formatEnumLabel(locale, 'loss', lead.loss_reason),
    });
  }

  if (details?.university) {
    metaItems.push({ term: t('filters.university'), value: details.university });
  }

  if (details?.budget_min != null || details?.budget_max != null) {
    metaItems.push({
      term: t('leads.budget'),
      value: `${details?.budget_min ?? t('common.emDash')} – ${details?.budget_max ?? t('common.emDash')}`,
    });
  }

  return (
    <div className="space-y-5">
      {lead.notes && (
        <div>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
            {t('leads.notes')}
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
            {lead.notes}
          </p>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          {t('leads.status')}
        </h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={lead.funnel_status} type="funnel" />
          <StatusBadge status={lead.sla_status} type="sla" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          {t('leads.details')}
        </h3>
        <KvList items={metaItems} layout="stacked" />
      </div>

      <SourceDetailsPanel sourceDetails={lead.source_details} embedded />
    </div>
  );
}
