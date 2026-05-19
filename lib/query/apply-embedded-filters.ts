/**
 * Applies filter conditions to Supabase embedded resource paths (e.g. lead_details.field).
 */
import type { FilterCondition } from '@/lib/query/filter-builder';

/**
 * Applies filters to an embedded relation using dotted column paths.
 * @param query - Supabase query builder.
 * @param embedPrefix - Embed path prefix (e.g. lead_details).
 * @param filters - Filter conditions for embedded columns.
 * @returns Modified query builder.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyEmbeddedFilters<T extends { filter: (...args: any[]) => T }>(
  query: T,
  embedPrefix: string,
  filters: FilterCondition[],
): T {
  let result = query;

  for (const { field, operator, value } of filters) {
    const column = `${embedPrefix}.${field}`;

    switch (operator) {
      case 'eq':
        result = result.filter(column, 'eq', value);
        break;
      case 'neq':
        result = result.filter(column, 'neq', value);
        break;
      case 'gt':
        result = result.filter(column, 'gt', value);
        break;
      case 'gte':
        result = result.filter(column, 'gte', value);
        break;
      case 'lt':
        result = result.filter(column, 'lt', value);
        break;
      case 'lte':
        result = result.filter(column, 'lte', value);
        break;
      case 'ilike':
        result = result.filter(column, 'ilike', value);
        break;
      case 'in':
        result = result.filter(column, 'in', `(${value})`);
        break;
      case 'is':
        result = result.filter(column, 'is', value);
        break;
    }
  }

  return result;
}
