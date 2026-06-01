/**
 * Archived lead detail page — read-only, manager-only.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ArchivedLeadActions } from '@/components/leads/ArchivedLeadActions';
import { ContactHistoryList } from '@/components/leads/ContactHistoryList';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KvList } from '@/components/ui/kv-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, formatEnumLabel } from '@/lib/i18n';
import { normalizeLeadDetails } from '@/lib/leads/normalize-lead-details';
import { displayLeadPhone } from '@/lib/ui/display-phone';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/auth/roles';
import type { ArchivedLeadRow, ContactHistoryEntry, LeadDetailRow } from '@/types/domain';

/**
 * Renders read-only archived lead detail with history and unarchive action.
 * @returns Archived lead detail page wrapped in AppShell.
 */
export default function ArchivedLeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale, t } = useTranslation();
  const { user } = useAuth();

  const [lead, setLead] = useState<ArchivedLeadRow | null>(null);
  const [details, setDetails] = useState<LeadDetailRow | null>(null);
  const [history, setHistory] = useState<ContactHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLead = useCallback(async () => {
    if (typeof id !== 'string') return;

    setLoading(true);
    const res = await fetch(`/api/leads/archived/${id}`);
    const json = await res.json();

    if (res.ok) {
      setLead(json.data.lead as ArchivedLeadRow);
      setHistory(json.data.contactHistory as ContactHistoryEntry[]);
      setDetails(normalizeLeadDetails(json.data.leadDetails));
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  useEffect(() => {
    if (user && !isManagerOrAbove(user.role)) {
      router.replace('/leads');
    }
  }, [user, router]);

  if (user && !isManagerOrAbove(user.role)) {
    return null;
  }

  if (loading || !lead) {
    return (
      <AppShell title={t('archived.leadTitle')}>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  const leadId = String(id);
  const emDash = t('common.emDash');

  return (
    <AppShell
      title={lead.lead_name ?? displayLeadPhone(lead)}
      actions={
        <Link href="/leads/archived" className="text-sm text-brand-blue hover:underline">
          {t('archived.backToList')}
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('archived.archiveSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <KvList
              items={[
                {
                  term: t('filters.outcome'),
                  value: (
                    <Badge variant={lead.archive_reason === 'won' ? 'success' : 'danger'}>
                      {formatEnumLabel(locale, 'archive', lead.archive_reason)}
                    </Badge>
                  ),
                },
                ...(lead.archive_reason === 'lost' && lead.loss_reason
                  ? [
                      {
                        term: t('filters.lossReason'),
                        value: formatEnumLabel(locale, 'loss', lead.loss_reason),
                      },
                    ]
                  : []),
                {
                  term: t('archived.tableArchived'),
                  value: formatDateTime(lead.archived_at, locale),
                },
                {
                  term: t('archived.funnelAtArchive'),
                  value: formatEnumLabel(locale, 'funnel', lead.funnel_status),
                },
                {
                  term: t('filters.source'),
                  value: formatEnumLabel(locale, 'source', lead.lead_source),
                },
                { term: t('leads.phone'), value: displayLeadPhone(lead) },
                {
                  term: t('filters.assignee'),
                  value: lead.salespeople?.full_name ?? emDash,
                },
                {
                  term: t('leads.created'),
                  value: formatDateTime(lead.created_at, locale),
                },
              ]}
            />
          </CardContent>
        </Card>

        <SourceDetailsPanel sourceDetails={lead.source_details} />

        {details && (
          <Card>
            <CardHeader>
              <CardTitle>{t('archived.leadDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <KvList
                items={[
                  { term: t('filters.university'), value: details.university ?? emDash },
                  {
                    term: t('leads.budget'),
                    value: `${details.budget_min ?? emDash} – ${details.budget_max ?? emDash}`,
                  },
                  { term: t('leads.moveIn'), value: details.move_in ?? emDash },
                  { term: t('filters.uniYear'), value: details.uni_year ?? emDash },
                ]}
              />
            </CardContent>
          </Card>
        )}

        <ArchivedLeadActions leadId={leadId} />

        <Card>
          <CardHeader>
            <CardTitle>{t('leads.contactHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactHistoryList entries={history} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
