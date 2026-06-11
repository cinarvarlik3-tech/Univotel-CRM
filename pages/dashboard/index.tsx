/**
 * Manager analytics dashboard page — Overview (MV aggregates) + Team panel
 * (salesperson metrics and trend data) tabs.
 */
import { AppShell } from '@/components/layout/AppShell';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { ManagerPanel } from '@/components/analytics/ManagerPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { useAnalytics } from '@/hooks/useAnalytics';

/**
 * Renders analytics dashboard for managers only.
 * @returns Dashboard page wrapped in AppShell.
 */
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const isManager = isManagerOrAbove(user?.role);
  const { data, error, isLoading } = useAnalytics(isManager === true);

  if (authLoading) {
    return (
      <AppShell title={t('analytics.title')}>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  return (
    <AppShell title={t('analytics.title')}>
      {!isManager && <p className="text-sm text-brand-red">{t('analytics.managerOnly')}</p>}

      {isManager && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t('analytics.overviewTab')}</TabsTrigger>
            <TabsTrigger value="team">{t('analytics.teamPanelTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isLoading && <Skeleton className="h-64 w-full" />}
            {error && <p className="text-sm text-brand-red">{t('analytics.failedToLoad')}</p>}
            {data && <AnalyticsDashboard data={data} />}
          </TabsContent>

          <TabsContent value="team">
            <ManagerPanel />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
