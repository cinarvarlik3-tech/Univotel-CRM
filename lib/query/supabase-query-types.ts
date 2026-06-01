/**
 * Minimal PostgREST query-builder shapes for filter helpers.
 */

/** Arguments passed to Supabase `.filter()` / `.not()` chain methods. */
export type PostgrestFilterArgs = [column: string, operator: string, value: unknown];

/** Root-table query builder with filter + not. */
export interface RootFilterableQuery {
  filter: (...args: PostgrestFilterArgs) => RootFilterableQuery;
  not: (...args: PostgrestFilterArgs) => RootFilterableQuery;
}

/** Embedded-table query builder with filter + not. */
export interface EmbeddedFilterableQuery {
  filter: (...args: PostgrestFilterArgs) => EmbeddedFilterableQuery;
  not: (...args: PostgrestFilterArgs) => EmbeddedFilterableQuery;
}

/** Query builder supporting composite `.or()` filters. */
export interface CompositeFilterableQuery {
  filter: (...args: PostgrestFilterArgs) => CompositeFilterableQuery;
  not: (...args: PostgrestFilterArgs) => CompositeFilterableQuery;
  or: (filters: string) => CompositeFilterableQuery;
}
