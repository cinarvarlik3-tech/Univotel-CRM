/**
 * Application shell with navigation and auth guard wrapper.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Wraps authenticated pages with nav bar and redirects unauthenticated users to login.
 * @param props - Child page content.
 * @returns Layout with navigation or loading/null state.
 */
export function AppShell({ children }: AppShellProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) return <div className="container">Loading...</div>;

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  return (
    <>
      <nav>
        {user.role === 'manager' && <Link href="/dashboard">Dashboard</Link>}
        <Link href="/leads">Leads</Link>
        <Link href="/tasks">Tasks</Link>
        <Link href="/leads/new">New Lead</Link>
        <Link href="/properties">Properties</Link>
        <Link href="/team">Team</Link>
        <span>
          {user.salesperson.full_name} ({user.role})
        </span>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </nav>
      <div className="container">{children}</div>
    </>
  );
}
