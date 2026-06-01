/**
 * Read-only summary card for lead detail page.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KvList } from '@/components/ui/kv-list';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime, formatYesNo } from '@/lib/i18n/format-date';
import { displayLeadPhone, displayParentPhone } from '@/lib/ui/display-phone';
import type { LeadWithDetails } from '@/types/domain';

interface LeadSummaryCardProps {
  lead: LeadWithDetails;
}

/**
 * Renders read-only lead summary fields.
 * @param props - Lead with joined data.
 * @returns Summary card element.
 */
export function LeadSummaryCard({ lead }: LeadSummaryCardProps) {
  const { locale, t } = useTranslation();
  const assignee = lead.salespeople?.full_name ?? lead.assignee_name ?? t('common.unassigned');

  const items = [
    { term: t('leads.phone'), value: displayLeadPhone(lead) },
    ...(lead.parent_phone
      ? [{ term: t('leads.parentPhone'), value: displayParentPhone(lead.parent_phone) }]
      : []),
    { term: t('filters.source'), value: formatEnumLabel(locale, 'source', lead.lead_source) },
    {
      term: t('filters.channel'),
      value: lead.message_from
        ? formatEnumLabel(locale, 'channel', lead.message_from)
        : t('common.emDash'),
    },
    { term: t('filters.language'), value: formatEnumLabel(locale, 'language', lead.language) },
    { term: t('leads.leadScore'), value: String(lead.lead_score ?? 0) },
    {
      term: t('filters.organic'),
      value: formatYesNo(lead.is_organic, locale),
    },
    {
      term: t('leads.assignee'),
      value: `${assignee}${lead.salespeople?.email ? ` (${lead.salespeople.email})` : ''}`,
    },
    {
      term: t('filters.sla'),
      value: (
        <span className="inline-flex items-center gap-2">
          <StatusBadge status={lead.sla_status} type="sla" />
          {lead.sla_deadline && formatDateTime(lead.sla_deadline, locale)}
        </span>
      ),
    },
    { term: t('leads.funnel'), value: <StatusBadge status={lead.funnel_status} type="funnel" /> },
    ...(lead.loss_reason
      ? [
          {
            term: t('filters.lossReason'),
            value: formatEnumLabel(locale, 'loss', lead.loss_reason),
          },
        ]
      : []),
    {
      term: t('leads.studentStage'),
      value: formatEnumLabel(locale, 'stage', lead.student_stage),
    },
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
    ...(lead.notes ? [{ term: t('leads.notes'), value: lead.notes }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('leads.summary')}</CardTitle>
      </CardHeader>
      <CardContent>
        <KvList items={items} />
      </CardContent>
    </Card>
  );
}
