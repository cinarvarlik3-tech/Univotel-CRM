/**
 * Applies filter conditions to Supabase embedded resource paths (e.g. lead_details.field).
 */
import type { FilterCondition } from '@/lib/query/filter-builder';
import type { EmbeddedFilterableQuery } from '@/lib/query/supabase-query-types';

/**
 * Applies filters to an embedded relation using dotted column paths.
 * @param query - Supabase query builder.
 * @param embedPrefix - Embed path prefix (e.g. lead_details).
 * @param filters - Filter conditions for embedded columns.
 * @returns Modified query builder.
 */
export function applyEmbeddedFilters<T extends EmbeddedFilterableQuery>(
  query: T,
  embedPrefix: string,
  filters: FilterCondition[],
): T {
  let result: EmbeddedFilterableQuery = query;

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
        if (value === 'not.null') {
          result = result.not(column, 'is', null);
        } else {
          result = result.filter(column, 'is', value === 'null' ? null : value);
        }
        break;
      case 'cs':
        result = result.filter(column, 'cs', value);
        break;
      case 'ov':
        result = result.filter(column, 'ov', value);
        break;
    }
  }

  return result as T;
}
