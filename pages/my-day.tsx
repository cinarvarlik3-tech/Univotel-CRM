/**
 * My Day — personal salesperson cockpit.
 * Landing page for all roles; self-scoped to the logged-in user.
 */
import { useCallback, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CounterStrip } from '@/components/my-day/CounterStrip';
import { TaskPanel } from '@/components/my-day/TaskPanel';
import { AttentionQueue } from '@/components/my-day/AttentionQueue';
import { MiniFunnel } from '@/components/my-day/MiniFunnel';
import { PerformanceTab } from '@/components/my-day/PerformanceTab';
import { SonAramalar } from '@/components/my-day/SonAramalar';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import { useMyDay } from '@/hooks/useMyDay';
import { useAuth } from '@/hooks/useAuth';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';

export default function MyDayPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();
  const { data, isLoading, error, mutate } = useMyDay();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const handleMutate = useCallback(() => {
    void mutate();
  }, [mutate]);

  const openLead = useCallback((uuid: string) => setSelectedLeadId(uuid), []);
  const closeLead = useCallback(() => setSelectedLeadId(null), []);

  const isManager = user ? isManagerOrAbove(user.role) : false;

  return (
    <AppShell title={t('myDay.title')}>
      <Tabs defaultValue="today">
        <TabsList className="mb-4">
          <TabsTrigger value="today">{t('myDay.todayTab')}</TabsTrigger>
          <TabsTrigger value="performance">{t('myDay.performanceTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] rounded-[10px]" />
                ))}
              </div>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {error && <p className="text-sm text-brand-red">{t('myDay.failedToLoad')}</p>}

          {data && (
            <div className="space-y-6">
              <CounterStrip counters={data.counters} />

              <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <div className="space-y-6">
                  <TaskPanel tasks={data.tasks} onMutate={handleMutate} onOpenLead={openLead} />
                  <AttentionQueue
                    items={data.attentionQueue}
                    onMutate={handleMutate}
                    onOpenLead={openLead}
                  />
                  {/* D22: Son Aramalar — last 20 CDR calls, unlogged ones need action */}
                  <SonAramalar calls={data.recentCalls} onOpenLead={openLead} />
                </div>
                <div>
                  <MiniFunnel data={data.miniFunnel} />
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab />
        </TabsContent>
      </Tabs>

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
