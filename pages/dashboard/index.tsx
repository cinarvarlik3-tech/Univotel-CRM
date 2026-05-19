/**
 * Manager analytics dashboard page.
 */
import { AppShell } from '@/components/layout/AppShell';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';

/**
 * Renders analytics dashboard for managers only.
 * @returns Dashboard page wrapped in AppShell.
 */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const isManager = user?.role === 'manager';
  const { data, error, isLoading } = useAnalytics(isManager === true);

  if (authLoading) {
    return (
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1>Dashboard</h1>

      {!isManager && (
        <p className="error">Manager access only. Contact an administrator for analytics.</p>
      )}

      {isManager && isLoading && <p>Loading analytics...</p>}
      {isManager && error && <p className="error">Failed to load analytics</p>}
      {isManager && data && <AnalyticsDashboard data={data} />}
    </AppShell>
  );
}
