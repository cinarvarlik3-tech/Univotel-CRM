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
import { isManagerOrAbove, isSuperadmin } from '@/lib/auth/roles';

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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-surface-page pl-[60px]">
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
      />

      <div className="min-h-screen bg-surface-page pl-[60px]">
        <div className="flex min-h-screen flex-col">
          <Topbar title={pageTitle} count={count} actions={actions} />
          <main className="flex-1 px-5 py-[18px]">{children}</main>
        </div>
      </div>
    </>
  );
}
