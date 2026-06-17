/**
 * Auth context hook for session, role, and logout.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { parseUserRole } from '@/lib/auth/roles';
import type { SessionUser } from '@/lib/auth/get-session-user';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

/**
 * Provides auth state to the component tree.
 * @param props - Child components.
 * @returns Auth provider wrapper.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: salespersonData } = await supabase
      .from('salespeople')
      .select('id, full_name, email, role, partner_id')
      .eq('id', authUser.id)
      .maybeSingle();

    const salesperson = salespersonData as {
      id: string;
      full_name: string;
      email: string;
      role: string;
      partner_id: string | null;
    } | null;

    if (!salesperson) {
      setUser(null);
    } else {
      const role = parseUserRole(salesperson.role);
      if (!role) {
        setUser(null);
      } else {
        setUser({
          userId: authUser.id,
          email: authUser.email ?? salesperson.email,
          role,
          partnerId: salesperson.partner_id ?? null,
          salesperson,
        });
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        void refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Returns current auth context value.
 * @returns Auth context with user, loading, logout, refresh.
 */
export function useAuth() {
  return useContext(AuthContext);
}
