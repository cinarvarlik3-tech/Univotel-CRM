/**
 * Manager analytics dashboard page.
 */
import { AppShell } from '@/components/layout/AppShell';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Skeleton } from '@/components/ui/skeleton';
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

      {isManager && isLoading && <Skeleton className="h-64 w-full" />}
      {isManager && error && (
        <p className="text-sm text-brand-red">{t('analytics.failedToLoad')}</p>
      )}
      {isManager && data && <AnalyticsDashboard data={data} />}
    </AppShell>
  );
}
