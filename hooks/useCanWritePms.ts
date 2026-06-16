/**
 * Returns whether the current user can write PMS data.
 */
import { useAuth } from '@/hooks/useAuth';
import { canWritePms } from '@/lib/auth/roles';

export function useCanWritePms(): boolean {
  const { user } = useAuth();
  return canWritePms(user?.role);
}
