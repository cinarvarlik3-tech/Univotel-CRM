/**
 * Application shell with sidebar, topbar, and auth guard wrapper.
 */
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useSidebarState } from '@/hooks/useSidebarState';
import { isManagerOrAbove, isPartnerOperator, isSuperadmin } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

// Routes explicitly redirected for partner_operators (checked before PARTNER_ALLOWED_PREFIXES).
const PARTNER_REDIRECT: Record<string, string> = {
  '/leads/hub': '/leads',
};

// Routes that are explicitly blocked even though they share a prefix with an allowed route.
const PARTNER_BLOCKED = new Set([
  '/leads/archived',
  '/leads/hub',
  '/leads/expecting-call',
  '/deal-awaiting',
]);

// Pathname prefixes that partner_operators may visit; everything else shows the not-allowed view.
const PARTNER_ALLOWED_PREFIXES = ['/leads', '/visits', '/move-in', '/tasks', '/settings', '/pms'];

interface AppShellProps {
  children: ReactNode;
  title?: string;
  count?: number;
  actions?: ReactNode;
}

/**
 * Wraps authenticated pages with sidebar layout and redirects unauthenticated users.
 * @param props - Child page content and optional topbar props.
 * @returns Layout with sidebar navigation or loading/null state.
 */
export function AppShell({ children, title, count, actions }: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [sidebarCollapsed, toggleSidebar] = useSidebarState();

  if (loading) {
    return (
      <div className="flex min-h-screen bg-surface-page pl-[220px]">
        <div className="flex flex-1 flex-col">
          <Skeleton className="h-[52px] w-full rounded-none" />
          <div className="p-5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-4 h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  // Partner operator route guard — must run after user is confirmed.
  if (isPartnerOperator(user.role)) {
    const redirect = PARTNER_REDIRECT[router.pathname];
    if (redirect) {
      router.replace(redirect);
      return null;
    }

    const blocked = PARTNER_BLOCKED.has(router.pathname);
    const allowed =
      !blocked &&
      PARTNER_ALLOWED_PREFIXES.some(
        (prefix) => router.pathname === prefix || router.pathname.startsWith(prefix + '/'),
      );

    if (!allowed) {
      router.replace('/leads');
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-page">
          <div className="text-center">
            <p className="text-xl font-semibold text-text-primary">Erişiminiz olmayan sayfa.</p>
            <p className="mt-1 text-sm text-text-secondary">
              Yetkilendirme gerektiren bir sayfaya erişmeye çalıştınız.
            </p>
          </div>
        </div>
      );
    }
  }

  const pageTitle = title ?? t('app.name');

  return (
    <>
      <Head>
        <title>
          {pageTitle} — {t('app.titleSuffix')}
        </title>
      </Head>

      <Sidebar
        userName={user.salesperson.full_name}
        userRole={user.role}
        isManager={isManagerOrAbove(user.role)}
        isSuperadminUser={isSuperadmin(user.role)}
        isPartnerOperatorUser={isPartnerOperator(user.role)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* D24: 220px default (always-open), 60px when user opts to collapse */}
      <div
        className={cn(
          'min-h-screen bg-surface-page transition-[padding-left] duration-200 ease-in-out motion-reduce:transition-none',
          sidebarCollapsed ? 'pl-[60px]' : 'pl-[220px]',
        )}
      >
        <div className="flex min-h-screen flex-col">
          <Topbar
            title={pageTitle}
            count={count}
            actions={actions}
            hideSearch={isPartnerOperator(user.role)}
          />
          {/* D26: hard max-width cap — stops edge-to-edge stretch on ultrawide monitors */}
          <main className="flex-1 px-5 py-[18px]">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
