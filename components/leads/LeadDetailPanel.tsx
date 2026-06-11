/**
 * Slide-over lead detail panel with tabbed sections.
 */
import { useEffect, useState } from 'react';
import { DetayTab } from '@/components/leads/DetayTab';
import { GenelTab } from '@/components/leads/GenelTab';
import { LeadDetailHeader } from '@/components/leads/LeadDetailHeader';
import { LeadChatView } from '@/components/leads/LeadChatView';
import { FunnelView } from '@/components/leads/FunnelView';
import { ProfilTab } from '@/components/leads/ProfilTab';
import { ManagerLeadActions } from '@/components/leads/ManagerLeadActions';
import { ContactHistorySection } from '@/components/leads/ContactHistorySection';
import { VisitScheduleDialog } from '@/components/leads/VisitScheduleDialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/useTranslation';
import { useLeadDetail } from '@/hooks/useLeadDetail';
import type { SalespersonOption } from '@/types/domain';

interface LeadDetailPanelProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  isManager: boolean;
  salespeople?: SalespersonOption[];
}

/**
 * Renders the lead detail slide-over with tabs.
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
  const { t } = useTranslation();
  const { lead, details, history, loading, error, reload, applyLeadPatch, applyDetailsPatch } =
    useLeadDetail(open ? (leadId ?? undefined) : undefined);
  const [tab, setTab] = useState('genel');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);

  useEffect(() => {
    setTab('genel');
    setIsFullScreen(false);
    setVisitDialogOpen(false);
  }, [leadId]);

  const sourceDetails =
    lead?.source_details && typeof lead.source_details === 'object'
      ? (lead.source_details as Record<string, unknown>)
      : null;

  const chatwootUrl =
    sourceDetails && typeof sourceDetails.chatwoot_url === 'string'
      ? sourceDetails.chatwoot_url
      : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          'flex h-full flex-col gap-0 overflow-hidden p-0',
          isFullScreen && 'w-screen max-w-none',
        )}
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
              details={details}
              leadId={leadId}
              onClose={onClose}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen((v) => !v)}
              onScheduleVisit={() => setVisitDialogOpen(true)}
            />

            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="h-auto shrink-0 overflow-x-auto px-5 pt-2">
                <TabsTrigger value="genel">{t('leads.overview')}</TabsTrigger>
                <TabsTrigger value="profil">{t('leads.profile')}</TabsTrigger>
                <TabsTrigger value="detay">{t('leads.detay')}</TabsTrigger>
                <TabsTrigger value="conversation">{t('leads.conversation')}</TabsTrigger>
                <TabsTrigger value="funnel-view">Funnel</TabsTrigger>
                <TabsTrigger value="history">{t('leads.history')}</TabsTrigger>
                {isManager && <TabsTrigger value="actions">{t('leads.actions')}</TabsTrigger>}
              </TabsList>

              <TabsContent
                value="genel"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
              >
                <GenelTab
                  lead={lead}
                  leadId={leadId}
                  details={details}
                  onLeadSaved={applyLeadPatch}
                  onDetailsSaved={applyDetailsPatch}
                />
              </TabsContent>

              <TabsContent
                value="profil"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
              >
                <ProfilTab
                  lead={lead}
                  leadId={leadId}
                  details={details}
                  onLeadSaved={applyLeadPatch}
                  onDetailsSaved={applyDetailsPatch}
                />
              </TabsContent>

              <TabsContent
                value="detay"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
              >
                <DetayTab
                  lead={lead}
                  leadId={leadId}
                  details={details}
                  onLeadSaved={applyLeadPatch}
                  onDetailsSaved={applyDetailsPatch}
                  onReload={reload}
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

            <VisitScheduleDialog
              open={visitDialogOpen}
              leadUuid={leadId}
              onClose={() => setVisitDialogOpen(false)}
              onSuccess={reload}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
