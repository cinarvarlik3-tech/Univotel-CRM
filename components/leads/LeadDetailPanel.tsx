/**
 * Slide-over lead detail panel with tabbed sections.
 */
import { useEffect, useState } from 'react';
import { LeadContactFieldsForm } from '@/components/leads/LeadContactFieldsForm';
import { LeadCoreFieldsForm } from '@/components/leads/LeadCoreFieldsForm';
import { LeadDetailHeader } from '@/components/leads/LeadDetailHeader';
import { LeadDetailOverview } from '@/components/leads/LeadDetailOverview';
import { LeadDetailsForm } from '@/components/leads/LeadDetailsForm';
import { LeadRecommendationPanel } from '@/components/leads/LeadRecommendationPanel';
import { LeadSection } from '@/components/leads/LeadSection';
import { LeadStatusForm } from '@/components/leads/LeadStatusForm';
import { ManagerLeadActions } from '@/components/leads/ManagerLeadActions';
import { ContactHistorySection } from '@/components/leads/ContactHistorySection';
import { LeadChatView } from '@/components/leads/LeadChatView';
import { FunnelView } from '@/components/leads/FunnelView';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KvList } from '@/components/ui/kv-list';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatYesNo } from '@/lib/i18n/format-date';
import type { TranslateFn } from '@/lib/i18n/create-translator';
import type { Locale } from '@/lib/i18n/types';
import { localeToBcp47 } from '@/lib/i18n/types';
import { displayParentPhone } from '@/lib/ui/display-phone';
import { formatStudentGender } from '@/lib/ui/format-student-gender';
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
 * @param t - Translator function.
 * @param locale - Active UI locale.
 * @returns Key-value items for display.
 */
function studentDetailsViewItems(details: LeadDetailRow | null, t: TranslateFn, locale: Locale) {
  if (!details) return [{ term: t('leads.details'), value: t('leads.noProfileData') }];

  const items = [
    { term: t('filters.university'), value: details.university ?? t('common.emDash') },
    {
      term: t('leads.budget'),
      value:
        details.budget_min != null || details.budget_max != null
          ? `${details.budget_min ?? t('common.emDash')} – ${details.budget_max ?? t('common.emDash')}`
          : t('common.emDash'),
    },
    {
      term: t('leads.moveIn'),
      value: details.move_in
        ? new Date(details.move_in).toLocaleDateString(localeToBcp47(locale))
        : t('common.emDash'),
    },
    {
      term: t('filters.uniYear'),
      value: details.uni_year
        ? formatEnumLabel(locale, 'uniYear', details.uni_year)
        : t('common.emDash'),
    },
    { term: t('leads.parentName'), value: details.parent_name ?? t('common.emDash') },
    {
      term: t('filters.preferredDistrict'),
      value: details.preferred_district ?? t('common.emDash'),
    },
    {
      term: t('filters.gender'),
      value: formatStudentGender(details.student_gender, locale),
    },
    { term: t('filters.nationality'), value: details.nationality ?? t('common.emDash') },
    {
      term: t('leads.hotels'),
      value: details.interested_hotel?.length
        ? details.interested_hotel.join(', ')
        : t('common.emDash'),
    },
    {
      term: t('leads.roomTypes'),
      value: details.room_type?.length ? details.room_type.join(', ') : t('common.emDash'),
    },
    {
      term: t('leads.dormAwaiting'),
      value: details.dorm_awaiting?.length
        ? details.dorm_awaiting.map((v) => formatEnumLabel(locale, 'dorm', v)).join(', ')
        : t('common.emDash'),
    },
    { term: t('filters.kvkkOptIn'), value: formatYesNo(details.kvkk_opt_in, locale) },
    { term: t('filters.marketingOptIn'), value: formatYesNo(details.marketing_opt_in, locale) },
    { term: t('leads.recCampus'), value: details.campus ?? t('common.emDash') },
    {
      term: t('leads.recRoomType'),
      value: details.room_category
        ? formatEnumLabel(locale, 'room', details.room_category)
        : t('common.emDash'),
    },
    {
      term: t('leads.recDistrictPref'),
      value: details.district_preference ?? t('common.emDash'),
    },
  ];

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
  const { locale, t } = useTranslation();
  const { lead, details, history, loading, error, reload } = useLeadDetail(
    open ? (leadId ?? undefined) : undefined,
  );
  const [tab, setTab] = useState('overview');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    setTab('overview');
    setIsFullScreen(false);
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
      <SheetContent
        side="right"
        className={cn('flex h-full flex-col gap-0 p-0', isFullScreen && 'w-screen max-w-none')}
        hideClose
      >
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
            <LeadDetailHeader
              lead={lead}
              leadId={leadId}
              onClose={onClose}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen((v) => !v)}
            />

            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="h-auto shrink-0 px-5 pt-2">
                <TabsTrigger value="overview">{t('leads.overview')}</TabsTrigger>
                <TabsTrigger value="profile">{t('leads.profile')}</TabsTrigger>
                <TabsTrigger value="conversation">{t('leads.conversation')}</TabsTrigger>
                <TabsTrigger value="funnel-view">Funnel View</TabsTrigger>
                <TabsTrigger value="history">{t('leads.history')}</TabsTrigger>
                {isManager && <TabsTrigger value="actions">{t('leads.actions')}</TabsTrigger>}
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
                value="funnel-view"
                className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
              >
                {tab === 'funnel-view' && (
                  <FunnelView
                    leadId={leadId}
                    salespeople={salespeople}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={() => setIsFullScreen((v) => !v)}
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
  const { locale, t } = useTranslation();

  return (
    <div>
      <LeadSection
        title={t('leads.contact')}
        defaultExpanded
        resetKey={resetKey}
        view={
          <KvList
            layout="stacked"
            items={[
              {
                term: t('leads.parentPhone'),
                value: displayParentPhone(lead.parent_phone),
              },
            ]}
          />
        }
      >
        <LeadContactFieldsForm lead={lead} leadId={leadId} onSaved={onSaved} embedded />
      </LeadSection>

      <LeadSection
        title={t('leads.classification')}
        resetKey={resetKey}
        view={
          <KvList
            layout="stacked"
            items={[
              {
                term: t('leads.studentStage'),
                value: formatEnumLabel(locale, 'stage', lead.student_stage),
              },
              {
                term: t('filters.language'),
                value: formatEnumLabel(locale, 'language', lead.language),
              },
              { term: t('leads.leadScore'), value: String(lead.lead_score ?? 0) },
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
              { term: t('leads.notes'), value: lead.notes ?? t('common.emDash') },
            ]}
          />
        }
      >
        <LeadCoreFieldsForm lead={lead} leadId={leadId} onSaved={onSaved} embedded />
      </LeadSection>

      <LeadSection
        title={t('leads.studentDetails')}
        resetKey={resetKey}
        view={<KvList layout="stacked" items={studentDetailsViewItems(details, t, locale)} />}
      >
        <LeadDetailsForm
          key={detailsKey}
          leadId={leadId}
          details={details}
          onSaved={onSaved}
          embedded
        />
      </LeadSection>

      <section className="border-b border-border-default py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {t('leads.hotelRecommendation')}
        </p>
        <div className="mt-3 pl-5">
          <LeadRecommendationPanel leadId={leadId} details={details} onRecLoaded={onSaved} />
        </div>
      </section>

      <LeadSection
        title={t('leads.pipeline')}
        resetKey={resetKey}
        view={
          <KvList
            layout="stacked"
            items={[
              {
                term: t('leads.funnelStatus'),
                value: <StatusBadge status={lead.funnel_status} type="funnel" />,
              },
              {
                term: t('filters.lossReason'),
                value: lead.loss_reason
                  ? formatEnumLabel(locale, 'loss', lead.loss_reason)
                  : t('common.emDash'),
              },
            ]}
          />
        }
      >
        <LeadStatusForm lead={lead} leadId={leadId} onSaved={onSaved} embedded />
      </LeadSection>
    </div>
  );
}
