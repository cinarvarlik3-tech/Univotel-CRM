/**
 * Slide-over lead detail panel with tabbed sections.
 */
import { useEffect, useState } from 'react';
import { LeadContactFieldsForm } from '@/components/leads/LeadContactFieldsForm';
import { LeadCoreFieldsForm } from '@/components/leads/LeadCoreFieldsForm';
import { LeadDetailHeader } from '@/components/leads/LeadDetailHeader';
import { LeadDetailOverview } from '@/components/leads/LeadDetailOverview';
import { LeadDetailsForm } from '@/components/leads/LeadDetailsForm';
import { LeadSection } from '@/components/leads/LeadSection';
import { LeadStatusForm } from '@/components/leads/LeadStatusForm';
import { ManagerLeadActions } from '@/components/leads/ManagerLeadActions';
import { ContactHistorySection } from '@/components/leads/ContactHistorySection';
import { LeadChatView } from '@/components/leads/LeadChatView';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KvList } from '@/components/ui/kv-list';
import { StatusBadge } from '@/components/ui/status-badge';
import { displayParentPhone } from '@/lib/ui/display-phone';
import { useLeadDetail } from '@/hooks/useLeadDetail';
import type { LeadDetailRow, LeadWithDetails, SalespersonOption } from '@/types/domain';

interface LeadDetailPanelProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  isManager: boolean;
  salespeople?: SalespersonOption[];
}

/**
 * Builds read-only KvList items for student details.
 * @param details - Lead detail row.
 * @returns Key-value items for display.
 */
function studentDetailsViewItems(details: LeadDetailRow | null) {
  if (!details) return [{ term: 'Details', value: 'No profile data yet' }];

  const items = [
    { term: 'University', value: details.university ?? '—' },
    {
      term: 'Budget',
      value:
        details.budget_min != null || details.budget_max != null
          ? `${details.budget_min ?? '—'} – ${details.budget_max ?? '—'}`
          : '—',
    },
    {
      term: 'Move-in',
      value: details.move_in ? new Date(details.move_in).toLocaleDateString('tr-TR') : '—',
    },
    { term: 'Uni year', value: details.uni_year ?? '—' },
    { term: 'Parent name', value: details.parent_name ?? '—' },
    { term: 'Preferred district', value: details.preferred_district ?? '—' },
    { term: 'Gender', value: details.student_gender ?? '—' },
    { term: 'Nationality', value: details.nationality ?? '—' },
    {
      term: 'Hotels',
      value: details.interested_hotel?.length ? details.interested_hotel.join(', ') : '—',
    },
    {
      term: 'Room types',
      value: details.room_type?.length ? details.room_type.join(', ') : '—',
    },
    {
      term: 'Dorm awaiting',
      value: details.dorm_awaiting?.length ? details.dorm_awaiting.join(', ') : '—',
    },
    { term: 'KVKK opt-in', value: details.kvkk_opt_in ? 'Yes' : 'No' },
    { term: 'Marketing opt-in', value: details.marketing_opt_in ? 'Yes' : 'No' },
  ];

  if (details.rec_hotel) {
    items.unshift({ term: 'Recommended hotel', value: details.rec_hotel });
  }

  return items;
}

/**
 * Renders the 480px lead detail slide-over with tabs.
 * @param props - Lead ID, open state, and role flags.
 * @returns Sheet panel element.
 */
export function LeadDetailPanel({
  leadId,
  open,
  onClose,
  isManager,
  salespeople,
}: LeadDetailPanelProps) {
  const { lead, details, history, loading, error, reload } = useLeadDetail(
    open ? (leadId ?? undefined) : undefined,
  );
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    setTab('overview');
  }, [leadId]);

  const sourceDetails =
    lead?.source_details && typeof lead.source_details === 'object'
      ? (lead.source_details as Record<string, unknown>)
      : null;

  const chatwootUrl =
    sourceDetails && typeof sourceDetails.chatwoot_url === 'string'
      ? sourceDetails.chatwoot_url
      : null;

  const resetKey = lead?.updated_at ?? leadId ?? '';
  const detailsKey = details?.updated_at ?? details?.lead_uuid ?? leadId ?? '';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex h-full flex-col gap-0 p-0" hideClose>
        {loading && (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && !loading && (
          <div className="p-5">
            <p className="text-sm text-brand-red">{error}</p>
          </div>
        )}

        {lead && leadId && !loading && (
          <>
            <LeadDetailHeader lead={lead} leadId={leadId} onClose={onClose} />

            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="h-auto shrink-0 px-5 pt-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                {isManager && <TabsTrigger value="actions">Actions</TabsTrigger>}
              </TabsList>

              <TabsContent
                value="overview"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
              >
                <LeadDetailOverview lead={lead} details={details} />
              </TabsContent>

              <TabsContent
                value="profile"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
              >
                <ProfileTab
                  lead={lead}
                  leadId={leadId}
                  details={details}
                  detailsKey={detailsKey}
                  resetKey={resetKey}
                  onSaved={reload}
                />
              </TabsContent>

              <TabsContent
                value="conversation"
                className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
              >
                {tab === 'conversation' && (
                  <LeadChatView
                    leadId={leadId}
                    leadName={lead.lead_name}
                    chatwootUrl={chatwootUrl}
                  />
                )}
              </TabsContent>

              <TabsContent
                value="history"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
              >
                <ContactHistorySection
                  leadId={leadId}
                  entries={history}
                  onAdded={reload}
                  embedded
                />
              </TabsContent>

              {isManager && salespeople && (
                <TabsContent
                  value="actions"
                  className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
                >
                  <ManagerLeadActions
                    lead={lead}
                    leadId={leadId}
                    salespeople={salespeople}
                    onReassigned={reload}
                    embedded
                    onArchived={onClose}
                  />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ProfileTabProps {
  lead: LeadWithDetails;
  leadId: string;
  details: LeadDetailRow | null;
  detailsKey: string;
  resetKey: string;
  onSaved: () => void;
}

/**
 * Profile tab with collapsible read/edit sections.
 * @param props - Lead data and save handlers.
 * @returns Profile tab content.
 */
function ProfileTab({ lead, leadId, details, detailsKey, resetKey, onSaved }: ProfileTabProps) {
  return (
    <div>
      <LeadSection
        title="Contact"
        defaultExpanded
        resetKey={resetKey}
        view={
          <KvList
            layout="stacked"
            items={[{ term: 'Parent phone', value: displayParentPhone(lead.parent_phone) }]}
          />
        }
      >
        <LeadContactFieldsForm lead={lead} leadId={leadId} onSaved={onSaved} embedded />
      </LeadSection>

      <LeadSection
        title="Classification"
        resetKey={resetKey}
        view={
          <KvList
            layout="stacked"
            items={[
              { term: 'Student stage', value: lead.student_stage },
              { term: 'Language', value: lead.language },
              { term: 'Lead score', value: String(lead.lead_score ?? 0) },
              { term: 'Persona', value: lead.persona_type ?? '—' },
              { term: 'Special state', value: lead.special_state ?? '—' },
              { term: 'Notes', value: lead.notes ?? '—' },
            ]}
          />
        }
      >
        <LeadCoreFieldsForm lead={lead} leadId={leadId} onSaved={onSaved} embedded />
      </LeadSection>

      <LeadSection
        title="Student details"
        resetKey={resetKey}
        view={<KvList layout="stacked" items={studentDetailsViewItems(details)} />}
      >
        <LeadDetailsForm
          key={detailsKey}
          leadId={leadId}
          details={details}
          onSaved={onSaved}
          embedded
        />
      </LeadSection>

      <LeadSection
        title="Pipeline"
        resetKey={resetKey}
        view={
          <KvList
            layout="stacked"
            items={[
              {
                term: 'Funnel status',
                value: <StatusBadge status={lead.funnel_status} type="funnel" />,
              },
              { term: 'Loss reason', value: lead.loss_reason ?? '—' },
            ]}
          />
        }
      >
        <LeadStatusForm lead={lead} leadId={leadId} onSaved={onSaved} embedded />
      </LeadSection>
    </div>
  );
}
