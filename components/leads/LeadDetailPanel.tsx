/**
 * Lead detail slide-over — rebuilt with 3-tab structure (§3.2 / D7).
 * Tabs: Profil (default) · Konuşma · Geçmiş.
 * Identity bar: slim persistent header (§3.1 / D10, D13).
 * Bottom action bar: stage-action + log-contact + guarded destructive (§3.4 / D8).
 * Fullscreen: real two-column mode (§3.7 / D11).
 */
import { useEffect, useState } from 'react';
import { IconPhone } from '@tabler/icons-react';
import { LeadDetailHeader } from '@/components/leads/LeadDetailHeader';
import { LeadChatView } from '@/components/leads/LeadChatView';
import { PanelProfilTab } from '@/components/leads/PanelProfilTab';
import { PanelBottomActionBar } from '@/components/leads/PanelBottomActionBar';
import { PanelSaveToast } from '@/components/leads/PanelSaveToast';
import { ActivityTimeline } from '@/components/leads/ActivityTimeline';
import { VisitScheduleDialog } from '@/components/leads/VisitScheduleDialog';
import { LogContactDialog } from '@/components/actions/LogContactDialog';
import { CreateTaskDialog } from '@/components/actions/CreateTaskDialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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
 * Renders the lead detail slide-over with 3-tab structure.
 * @param props - Lead ID, open state, and role flags.
 */
export function LeadDetailPanel({ leadId, open, onClose, isManager }: LeadDetailPanelProps) {
  const {
    lead,
    details,
    timeInStageDays,
    loading,
    error,
    reload,
    applyLeadPatch,
    applyDetailsPatch,
  } = useLeadDetail(open ? (leadId ?? undefined) : undefined);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [logContactOpen, setLogContactOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  // D21: dirty-state edit protection — suppress silent re-renders while editing
  const [isEditing, setIsEditing] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // §3.5: detect no conversation before choosing default tab
  const hasConversation = Boolean(
    lead?.chatwoot_conversation_id ??
    (lead?.source_details &&
      typeof lead.source_details === 'object' &&
      'chatwoot_url' in lead.source_details),
  );

  const defaultTab = 'profil';
  const [tab, setTab] = useState(defaultTab);

  // Reset state on lead change
  useEffect(() => {
    setIsFullScreen(false);
    setVisitDialogOpen(false);
    setLogContactOpen(false);
    setCreateTaskOpen(false);
    setTab('profil');
    setSaveToast(null);
  }, [leadId]);

  // D21: guard-safe reload — defer if user is mid-edit, queue refresh for "when ready"
  function safeReload() {
    if (isEditing) {
      setPendingRefresh(true);
    } else {
      reload();
    }
  }

  const chatwootUrl =
    lead?.source_details &&
    typeof lead.source_details === 'object' &&
    'chatwoot_url' in lead.source_details &&
    typeof (lead.source_details as Record<string, unknown>).chatwoot_url === 'string'
      ? ((lead.source_details as Record<string, unknown>).chatwoot_url as string)
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
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading && (
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {error && !loading && (
            <div className="p-5">
              <p className="text-sm text-brand-red">{error}</p>
            </div>
          )}

          {lead && leadId && !loading && (
            <>
              {/* D21: non-destructive "data updated" cue while editing */}
              {pendingRefresh && (
                <div className="flex items-center justify-between bg-amber-50 px-4 py-1.5 text-xs dark:bg-amber-950/30">
                  <span className="text-amber-700 dark:text-amber-400">Bu lead güncellendi.</span>
                  <button
                    type="button"
                    className="font-semibold text-amber-700 underline dark:text-amber-400"
                    onClick={() => {
                      setPendingRefresh(false);
                      setIsEditing(false);
                      reload();
                    }}
                  >
                    Yenile
                  </button>
                </div>
              )}
              {/* Identity bar — persistent, slim (§3.1) */}
              <LeadDetailHeader
                lead={lead}
                details={details}
                timeInStageDays={timeInStageDays}
                onClose={onClose}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen((v) => !v)}
                onScheduleVisit={() => setVisitDialogOpen(true)}
                onCreateTask={() => setCreateTaskOpen(true)}
                onLogContact={() => setLogContactOpen(true)}
              />

              {/* §3.7: real two-column fullscreen mode */}
              {isFullScreen ? (
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {/* Left: conversation */}
                  <div className="flex min-h-0 w-1/2 flex-col overflow-hidden border-r border-border-default">
                    {hasConversation ? (
                      <LeadChatView
                        leadId={leadId}
                        leadName={lead.lead_name}
                        chatwootUrl={chatwootUrl}
                      />
                    ) : (
                      <CallOnlyEmptyState />
                    )}
                  </div>
                  {/* Right: profil + history tabs */}
                  <div className="flex min-h-0 w-1/2 flex-col overflow-hidden">
                    <Tabs
                      value={tab === 'konusma' ? 'profil' : tab}
                      onValueChange={setTab}
                      className="flex min-h-0 flex-1 flex-col"
                    >
                      <TabsList className="h-auto shrink-0 px-4 pt-2">
                        <TabsTrigger value="profil">Profil</TabsTrigger>
                        <TabsTrigger value="gecmis">Geçmiş</TabsTrigger>
                      </TabsList>
                      <TabsContent
                        value="profil"
                        className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-3 data-[state=inactive]:hidden"
                      >
                        <PanelProfilTab
                          lead={lead}
                          leadId={leadId}
                          details={details}
                          onLeadSaved={applyLeadPatch}
                          onDetailsSaved={applyDetailsPatch}
                          onSaveFailed={setSaveToast}
                          onDirtyChange={setIsEditing}
                        />
                      </TabsContent>
                      <TabsContent
                        value="gecmis"
                        className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-3 data-[state=inactive]:hidden"
                      >
                        <ActivityTimeline leadId={leadId} />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              ) : (
                /* Single-column tabbed mode */
                <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
                  <TabsList className="h-auto shrink-0 overflow-x-auto px-5 pt-2">
                    <TabsTrigger value="profil">Profil</TabsTrigger>
                    <TabsTrigger value="konusma">Konuşma</TabsTrigger>
                    <TabsTrigger value="gecmis">Geçmiş</TabsTrigger>
                  </TabsList>

                  {/* Profil tab — merged Genel + Profil + Detay, tiered (§3.3) */}
                  <TabsContent
                    value="profil"
                    className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
                  >
                    <PanelProfilTab
                      lead={lead}
                      leadId={leadId}
                      details={details}
                      onLeadSaved={applyLeadPatch}
                      onDetailsSaved={applyDetailsPatch}
                      onSaveFailed={setSaveToast}
                      onDirtyChange={setIsEditing}
                    />
                  </TabsContent>

                  {/* Konuşma tab */}
                  <TabsContent
                    value="konusma"
                    className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
                  >
                    {hasConversation ? (
                      tab === 'konusma' && (
                        <LeadChatView
                          leadId={leadId}
                          leadName={lead.lead_name}
                          chatwootUrl={chatwootUrl}
                        />
                      )
                    ) : (
                      <CallOnlyEmptyState />
                    )}
                  </TabsContent>

                  {/* Geçmiş tab — Aktiviteler timeline (§3.2) */}
                  <TabsContent
                    value="gecmis"
                    className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden"
                  >
                    {tab === 'gecmis' && <ActivityTimeline leadId={leadId} />}
                  </TabsContent>
                </Tabs>
              )}

              {/* Bottom sticky action bar (§3.4) */}
              <PanelBottomActionBar
                lead={lead}
                leadId={leadId}
                isManager={isManager}
                onPrimaryAction={() => setLogContactOpen(true)}
                onReload={safeReload}
                onClose={onClose}
              />

              <PanelSaveToast message={saveToast} onDismiss={() => setSaveToast(null)} />

              {/* Dialogs */}
              <VisitScheduleDialog
                open={visitDialogOpen}
                leadUuid={leadId}
                onClose={() => setVisitDialogOpen(false)}
                onSuccess={reload}
              />
              <LogContactDialog
                open={logContactOpen}
                leadUuid={leadId}
                onClose={() => setLogContactOpen(false)}
                onSuccess={reload}
              />
              <CreateTaskDialog
                open={createTaskOpen}
                leadUuid={leadId}
                onClose={() => setCreateTaskOpen(false)}
                onSuccess={reload}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** §3.5: Empty state for phone-only leads with no Chatwoot conversation. */
function CallOnlyEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <IconPhone className="size-8 text-text-tertiary" />
      <p className="text-sm font-medium text-text-secondary">WhatsApp görüşmesi yok</p>
      <p className="text-xs text-text-tertiary">Bu lead ile yalnızca telefon görüşmesi yapıldı.</p>
    </div>
  );
}
