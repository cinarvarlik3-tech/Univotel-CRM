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
import { normalizeLeadDetails } from '@/lib/leads/normalize-lead-details';
import { displayLeadPhone } from '@/lib/ui/display-phone';
import { useAuth } from '@/hooks/useAuth';
import type { ArchivedLeadRow, ContactHistoryEntry, LeadDetailRow } from '@/types/domain';

/**
 * Renders read-only archived lead detail with history and unarchive action.
 * @returns Archived lead detail page wrapped in AppShell.
 */
export default function ArchivedLeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;
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
    if (user && user.role !== 'manager') {
      router.replace('/leads');
    }
  }, [user, router]);

  if (user && user.role !== 'manager') {
    return null;
  }

  if (loading || !lead) {
    return (
      <AppShell title="Archived lead">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  const leadId = String(id);

  return (
    <AppShell
      title={lead.lead_name ?? displayLeadPhone(lead)}
      actions={
        <Link href="/leads/archived" className="text-sm text-brand-blue hover:underline">
          Back to archived list
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Archive summary</CardTitle>
          </CardHeader>
          <CardContent>
            <KvList
              items={[
                {
                  term: 'Outcome',
                  value: (
                    <Badge variant={lead.archive_reason === 'won' ? 'success' : 'danger'}>
                      {lead.archive_reason === 'won' ? 'Won' : 'Lost'}
                    </Badge>
                  ),
                },
                ...(lead.archive_reason === 'lost' && lead.loss_reason
                  ? [{ term: 'Loss reason', value: lead.loss_reason }]
                  : []),
                {
                  term: 'Archived',
                  value: new Date(lead.archived_at).toLocaleString('tr-TR'),
                },
                { term: 'Funnel status at archive', value: lead.funnel_status },
                { term: 'Source', value: lead.lead_source },
                { term: 'Phone', value: displayLeadPhone(lead) },
                { term: 'Assignee', value: lead.salespeople?.full_name ?? '—' },
                {
                  term: 'Created',
                  value: new Date(lead.created_at).toLocaleString('tr-TR'),
                },
              ]}
            />
          </CardContent>
        </Card>

        <SourceDetailsPanel sourceDetails={lead.source_details} />

        {details && (
          <Card>
            <CardHeader>
              <CardTitle>Lead details</CardTitle>
            </CardHeader>
            <CardContent>
              <KvList
                items={[
                  { term: 'University', value: details.university ?? '—' },
                  {
                    term: 'Budget',
                    value: `${details.budget_min ?? '—'} – ${details.budget_max ?? '—'}`,
                  },
                  { term: 'Move in', value: details.move_in ?? '—' },
                  { term: 'Uni year', value: details.uni_year ?? '—' },
                ]}
              />
            </CardContent>
          </Card>
        )}

        <ArchivedLeadActions leadId={leadId} />

        <Card>
          <CardHeader>
            <CardTitle>Contact history</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactHistoryList entries={history} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
