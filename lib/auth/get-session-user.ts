/**
 * Session user resolution for API routes and auth context.
 * Loads salespeople row matching authenticated Supabase user.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { parseUserRole, type UserRole } from '@/lib/auth/roles';
import { createServerSupabase } from '@/lib/supabase/server';

/** Authenticated session user with role and salesperson profile. */
export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
  salesperson: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

/**
 * Resolves the current session user and their salespeople profile.
 * @param req - Next.js API request.
 * @param res - Next.js API response.
 * @returns SessionUser if authenticated, null otherwise.
 */
export async function getSessionUser(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<SessionUser | null> {
  const supabase = createServerSupabase(req, res);

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session) return null;

  const { data: salespersonData, error: spError } = await supabase
    .from('salespeople')
    .select('id, full_name, email, role')
    .eq('id', session.user.id)
    .maybeSingle();

  const salesperson = salespersonData as {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;

  if (spError || !salesperson) return null;

  const role = parseUserRole(salesperson.role);
  if (!role) return null;

  return {
    userId: session.user.id,
    email: session.user.email ?? salesperson.email,
    role,
    salesperson,
  };
}
