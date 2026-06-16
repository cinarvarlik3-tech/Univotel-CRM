/**
 * My Day (Günüm) — personal salesperson cockpit.
 *
 * Tab 1 "Bugün": six task containers (Nurtures, Calls, Visits, Post-visit, Move-ins, Son Aramalar).
 *   Zero pipeline numbers — pure "what do I do today."
 * Tab 2 "Performansım": KPI tiles + conversion + connect rate + loss reasons + stuck leads.
 *   Personal mirror of the manager Team Panel, self-scoped.
 */
import { useCallback } from 'react';
import { useRouter } from 'next/router';
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
import { GenelPerformansTab } from '@/components/my-day/GenelPerformansTab';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import { useSalespeople } from '@/hooks/useSalespeople';

/** Reads selected lead UUID from router query (global quick-search uses `?selected=`). */
function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
}

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
  const router = useRouter();
  const { data: cockpit, isLoading, error, mutate } = useCockpit();
  const { data: salespeople } = useSalespeople();

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;

  const openLead = useCallback(
    (uuid: string) => {
      router.push({ pathname: '/my-day', query: { ...router.query, selected: uuid } }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  const closeLead = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: '/my-day', query: nextQuery }, undefined, { shallow: true });
    void mutate();
  }, [mutate, router]);

  const isManager = cockpit?.user.isManager ?? false;

  return (
    <AppShell title="Günüm">
      <div className="mx-auto w-full max-w-[1400px]">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="mb-5">
            <TabsTrigger value="today">Bugün</TabsTrigger>
            <TabsTrigger value="performance">Bugünlük Performans</TabsTrigger>
            <TabsTrigger value="genel">Genel Performans</TabsTrigger>
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

          {/* ── Tab 2: Bugünlük Performans ────────────────────────────── */}
          <TabsContent value="performance">
            <PerformanceTab />
          </TabsContent>

          {/* ── Tab 3: Genel Performans ───────────────────────────────── */}
          <TabsContent value="genel">
            <GenelPerformansTab />
          </TabsContent>
        </Tabs>
      </div>

      <LeadDetailPanel
        leadId={selectedLeadId}
        open={panelOpen}
        onClose={closeLead}
        isManager={isManager}
        salespeople={salespeople}
      />
    </AppShell>
  );
}
