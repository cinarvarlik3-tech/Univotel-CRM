/**
 * My Day — personal salesperson cockpit.
 * Landing page for all roles; self-scoped to the logged-in user.
 */
import { useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CounterStrip } from '@/components/my-day/CounterStrip';
import { TaskPanel } from '@/components/my-day/TaskPanel';
import { AttentionQueue } from '@/components/my-day/AttentionQueue';
import { MiniFunnel } from '@/components/my-day/MiniFunnel';
import { PerformanceTab } from '@/components/my-day/PerformanceTab';
import { useMyDay } from '@/hooks/useMyDay';
import { useTranslation } from '@/hooks/useTranslation';

export default function MyDayPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, mutate } = useMyDay();

  const handleMutate = useCallback(() => {
    void mutate();
  }, [mutate]);

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
                  <TaskPanel tasks={data.tasks} onMutate={handleMutate} />
                  <AttentionQueue items={data.attentionQueue} onMutate={handleMutate} />
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
    </AppShell>
  );
}
