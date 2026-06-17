/**
 * User role helpers for API routes and UI authorization checks.
 */

/** Valid salespeople.role values. */
export type UserRole = 'salesperson' | 'operator' | 'manager' | 'superadmin' | 'partner_operator';

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

/** Returns true when the role is a partner_operator (Academic House or future partners). */
export function isPartnerOperator(role: string | undefined | null): boolean {
  return role === 'partner_operator';
}

/**
 * Parses a database role string into UserRole when valid.
 * @param role - Raw role from salespeople table.
 * @returns Typed role or null when unknown.
 */
export function parseUserRole(role: string): UserRole | null {
  if (
    role === 'salesperson' ||
    role === 'operator' ||
    role === 'manager' ||
    role === 'superadmin' ||
    role === 'partner_operator'
  ) {
    return role;
  }
  return null;
}

/**
 * Returns true when role may write PMS data (place, vacate, notes, room admin).
 * Operator, manager, and superadmin inherit PMS write. partner_operator also has
 * PMS write, scoped to their own properties by RLS.
 */
export function canWritePms(role: string | undefined | null): boolean {
  return role === 'operator' || isManagerOrAbove(role) || isPartnerOperator(role);
}

/** Alias for canWritePms — operator, manager, superadmin, or partner_operator. */
export function isOperatorOrAbove(role: string | undefined | null): boolean {
  return canWritePms(role);
}

/**
 * Session guard helper — throws if role lacks PMS write access.
 */
export function requireOperatorWrite(role: string | undefined | null): void {
  if (!canWritePms(role)) {
    throw new Error('PMS_WRITE_FORBIDDEN');
  }
}
