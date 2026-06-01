/**
 * Manager notifications page — unresolved Telegram alert inbox.
 */
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { NotificationList } from '@/components/notifications/NotificationList';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { data, mutate, error, isLoading } = useNotifications();

  if (user && !isManagerOrAbove(user.role)) {
    if (typeof window !== 'undefined') router.replace('/leads');
    return null;
  }

  async function handleResolve(id: string) {
    const res = await fetch(`/api/notifications/${id}/resolve`, { method: 'PATCH' });
    if (res.ok) await mutate();
  }

  return (
    <AppShell title={t('notifications.title')}>
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('notifications.failedToLoad')}</p>}
      {data && <NotificationList items={data.items} onResolve={handleResolve} />}
    </AppShell>
  );
}
