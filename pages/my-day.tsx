/**
 * My Day (Günüm) — personal salesperson cockpit.
 *
 * Tab 1 "Bugün": six task containers (Nurtures, Calls, Visits, Post-visit, Move-ins, Son Aramalar).
 *   Zero pipeline numbers — pure "what do I do today."
 * Tab 2 "Performansım": KPI tiles + conversion + connect rate + loss reasons + stuck leads.
 *   Personal mirror of the manager Team Panel, self-scoped.
 */
import { useCallback, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCockpit } from '@/hooks/useCockpit';
import { NurturesCard } from '@/components/my-day/NurturesCard';
import { CallsCard } from '@/components/my-day/CallsCard';
import { VisitsCard } from '@/components/my-day/VisitsCard';
import { PostVisitCard } from '@/components/my-day/PostVisitCard';
import { MoveInsCard } from '@/components/my-day/MoveInsCard';
import { SonAramalarCard } from '@/components/my-day/SonAramalarCard';
import { PerformanceTab } from '@/components/my-day/PerformanceTab';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import { useSalespeople } from '@/hooks/useSalespeople';

/** Istanbul-localized date string, e.g. "12 Haziran 2026, Cuma". */
function istanbulDateLabel(): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export default function MyDayPage() {
  const { data: cockpit, isLoading, error, mutate } = useCockpit();
  const { data: salespeople } = useSalespeople();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const openLead = useCallback((uuid: string) => setSelectedLeadId(uuid), []);
  const closeLead = useCallback(() => {
    setSelectedLeadId(null);
    void mutate();
  }, [mutate]);

  const isManager = cockpit?.user.isManager ?? false;

  return (
    <AppShell title="Günüm">
      <div className="mx-auto w-full max-w-[1400px]">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="mb-5">
            <TabsTrigger value="today">Bugün</TabsTrigger>
            <TabsTrigger value="performance">Performansım</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Bugün ─────────────────────────────────────────── */}
          <TabsContent value="today">
            {/* Greeting strip */}
            <div className="mb-5 flex items-baseline justify-between">
              <div>
                <h1 className="text-xl font-semibold text-text-primary">
                  {cockpit ? `Merhaba, ${cockpit.user.firstName}` : 'Günüm'}
                </h1>
                <p className="text-sm text-text-tertiary capitalize">{istanbulDateLabel()}</p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-border-default bg-surface-card px-4 py-3 text-sm text-text-secondary">
                Veriler yüklenemedi.{' '}
                <button type="button" onClick={() => void mutate()} className="underline">
                  Tekrar dene
                </button>
              </div>
            )}

            {/* Task container grid
                xl: 3 cols × 2 rows — [Nurtures][Calls][Post-visit] / [Visits][Move-ins][Son Aramalar]
                md: 2 cols — priority source order
                mobile: 1 col — Calls, Nurtures, Post-visit, Visits, Move-ins, Son Aramalar */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {/* Row 1 */}
              <NurturesCard
                nurtures={cockpit?.nurtures ?? []}
                isLoading={isLoading}
                onOpenLead={openLead}
                onAction={openLead}
              />
              <CallsCard
                calls={cockpit?.calls ?? []}
                isLoading={isLoading}
                onOpenLead={openLead}
                onAction={openLead}
              />
              <PostVisitCard
                postVisit={cockpit?.postVisit ?? []}
                isLoading={isLoading}
                onOpenLead={openLead}
                onAction={openLead}
              />

              {/* Row 2 */}
              <VisitsCard
                visits={cockpit?.visits ?? []}
                properties={cockpit?.properties ?? []}
                homePropertyId={cockpit?.user.homePropertyId ?? null}
                isManager={isManager}
                isLoading={isLoading}
                onOpenLead={openLead}
                onUpdateVisit={openLead}
              />
              <MoveInsCard
                moveIns={cockpit?.moveIns ?? []}
                isLoading={isLoading}
                onOpenLead={openLead}
              />
              <SonAramalarCard
                calls={cockpit?.recentCalls ?? []}
                isLoading={isLoading}
                onOpenLead={openLead}
              />
            </div>
          </TabsContent>

          {/* ── Tab 2: Performansım ───────────────────────────────────── */}
          <TabsContent value="performance">
            <PerformanceTab />
          </TabsContent>
        </Tabs>
      </div>

      <LeadDetailPanel
        leadId={selectedLeadId}
        open={selectedLeadId !== null}
        onClose={closeLead}
        isManager={isManager}
        salespeople={salespeople}
      />
    </AppShell>
  );
}
