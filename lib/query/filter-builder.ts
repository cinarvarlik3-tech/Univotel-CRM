/**
 * Dynamic filter builder for lead list API queries.
 * Validates column names against whitelist before applying PostgREST filters.
 */
import { FILTERABLE_COLUMNS } from '@/lib/constants';

/** Parsed filter condition from query string. */
export interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

/** Error returned when filter validation fails. */
export interface FilterError {
  error: string;
}

/** Supported PostgREST filter operators. */
const VALID_OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'in', 'is']);

/**
 * Parses filter query params in format filter[field][operator]=value.
 * @param query - URL query record from Next.js API route.
 * @returns Array of parsed filter conditions.
 */
export function parseFilterParams(query: Record<string, string | string[] | undefined>): FilterCondition[] {
  const filters: FilterCondition[] = [];

  for (const [key, rawValue] of Object.entries(query)) {
    const match = key.match(/^filter\[([^\]]+)\]\[([^\]]+)\]$/);
    if (!match) continue;

    const [, field, operator] = match;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value === undefined) continue;

    filters.push({ field, operator, value });
  }

  return filters;
}

/**
 * Validates filter conditions against column whitelist and operator set.
 * @param filters - Parsed filter conditions.
 * @returns FilterError if invalid, null if valid.
 */
export function validateFilters(filters: FilterCondition[]): FilterError | null {
  for (const filter of filters) {
    if (!FILTERABLE_COLUMNS.has(filter.field)) {
      return { error: `Unknown filter field: ${filter.field}` };
    }
    if (!VALID_OPERATORS.has(filter.operator)) {
      return { error: `Unknown filter operator: ${filter.operator}` };
    }
  }
  return null;
}

/**
 * Applies validated filters to a Supabase query builder.
 * @param query - Supabase query builder instance.
 * @param filters - Validated filter conditions.
 * @returns Modified query builder.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters<T extends { filter: (...args: any[]) => T }>(
  query: T,
  filters: FilterCondition[],
): T {
  let result = query;

  for (const { field, operator, value } of filters) {
    switch (operator) {
      case 'eq':
        result = result.filter(field, 'eq', value);
        break;
      case 'neq':
        result = result.filter(field, 'neq', value);
        break;
      case 'gt':
        result = result.filter(field, 'gt', value);
        break;
      case 'gte':
        result = result.filter(field, 'gte', value);
        break;
      case 'lt':
        result = result.filter(field, 'lt', value);
        break;
      case 'lte':
        result = result.filter(field, 'lte', value);
        break;
      case 'ilike':
        result = result.filter(field, 'ilike', value);
        break;
      case 'in':
        result = result.filter(field, 'in', `(${value})`);
        break;
      case 'is':
        result = result.filter(field, 'is', value);
        break;
    }
  }

  return result;
}
