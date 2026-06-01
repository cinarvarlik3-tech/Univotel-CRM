/**
 * User role helpers for API routes and UI authorization checks.
 */

/** Valid salespeople.role values. */
export type UserRole = 'salesperson' | 'manager' | 'superadmin';

/**
 * Returns true for manager and superadmin roles.
 * Use this for manager-level API and UI access checks (superadmin inherits manager powers).
 * @param role - Salesperson role string.
 * @returns Whether role has manager-level access.
 */
export function isManagerOrAbove(role: string | undefined | null): boolean {
  return role === 'manager' || role === 'superadmin';
}

/**
 * Returns true only for superadmin role.
 * @param role - Salesperson role string.
 * @returns Whether role is superadmin.
 */
export function isSuperadmin(role: string | undefined | null): boolean {
  return role === 'superadmin';
}

/**
 * Returns true when role may access DNI admin UI and APIs.
 * @param role - Salesperson role string.
 * @returns Whether role can manage dni_numbers.
 */
export function canAccessDniAdmin(role: string | undefined | null): boolean {
  return isSuperadmin(role);
}

/**
 * Parses a database role string into UserRole when valid.
 * @param role - Raw role from salespeople table.
 * @returns Typed role or null when unknown.
 */
export function parseUserRole(role: string): UserRole | null {
  if (role === 'salesperson' || role === 'manager' || role === 'superadmin') {
    return role;
  }
  return null;
}
