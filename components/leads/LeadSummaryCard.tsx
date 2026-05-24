/**
 * Read-only summary card for lead detail page.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KvList } from '@/components/ui/kv-list';
import { StatusBadge } from '@/components/ui/status-badge';
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
  const assignee = lead.salespeople?.full_name ?? lead.assignee_name ?? 'Unassigned';

  const items = [
    { term: 'Phone', value: displayLeadPhone(lead) },
    ...(lead.parent_phone
      ? [{ term: 'Parent phone', value: displayParentPhone(lead.parent_phone) }]
      : []),
    { term: 'Source', value: lead.lead_source },
    { term: 'Channel', value: lead.message_from ?? '—' },
    { term: 'Language', value: lead.language },
    { term: 'Lead score', value: String(lead.lead_score ?? 0) },
    {
      term: 'Organic',
      value: lead.is_organic == null ? '—' : lead.is_organic ? 'Yes' : 'No',
    },
    {
      term: 'Assignee',
      value: `${assignee}${lead.salespeople?.email ? ` (${lead.salespeople.email})` : ''}`,
    },
    {
      term: 'SLA',
      value: (
        <span className="inline-flex items-center gap-2">
          <StatusBadge status={lead.sla_status} type="sla" />
          {lead.sla_deadline && new Date(lead.sla_deadline).toLocaleString('tr-TR')}
        </span>
      ),
    },
    { term: 'Funnel', value: <StatusBadge status={lead.funnel_status} type="funnel" /> },
    ...(lead.loss_reason ? [{ term: 'Loss reason', value: lead.loss_reason }] : []),
    { term: 'Student stage', value: lead.student_stage },
    { term: 'Persona', value: lead.persona_type ?? '—' },
    { term: 'Special state', value: lead.special_state ?? '—' },
    ...(lead.notes ? [{ term: 'Notes', value: lead.notes }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <KvList items={items} />
      </CardContent>
    </Card>
  );
}
