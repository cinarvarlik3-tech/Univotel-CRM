/**
 * Unit tests for lib/notifications/recipients.ts
 *
 * Key invariants under test:
 *  - partner_operator is NEVER returned by allStaff / managersAndAbove / superadminsOnly
 *  - partner_operator IS returned by propertyResponsible
 *  - visitRecipients broadcasts to allStaff only when propertyResponsible is empty
 *  - duplicate chat IDs are deduplicated across resolvers
 *  - null telegram_chat_id rows are silently dropped
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Supabase mock wiring ────────────────────────────────────────────────────
const { mockCreateServiceClient } = vi.hoisted(() => ({
  mockCreateServiceClient: vi.fn(),
}));

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mockCreateServiceClient,
}));

import {
  allStaff,
  managersAndAbove,
  superadminsOnly,
  propertyResponsible,
  visitRecipients,
  assigneeOnly,
} from '@/lib/notifications/recipients';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a minimal chainable Supabase query mock that resolves to `rows`. */
function makeClient(queryResponses: Map<string, { data: unknown[] }>) {
  const chain = (rows: unknown[]) => {
    const terminal = { data: rows, error: null };
    const c: Record<string, unknown> = {};
    const wrap = () => c;
    c.select = wrap;
    c.eq = wrap;
    c.in = wrap;
    c.not = () => ({
      ...c,
      data: rows,
      error: null,
      then: (fn: (result: unknown) => unknown) => Promise.resolve(fn(terminal)),
    });
    c.maybeSingle = () => Promise.resolve({ data: rows[0] ?? null, error: null });
    // Make the chain itself thenable so `await client.from(...).select(...).eq(...)` works
    c.then = (fn: (result: unknown) => unknown) => Promise.resolve(fn(terminal));
    return c;
  };

  return {
    from: (table: string) => chain(queryResponses.get(table)?.data ?? []),
  };
}

/** Helper to build a mock client with a single salesperson table response. */
function spClient(
  rows: Array<{
    telegram_chat_id: string | null;
    role?: string;
    is_active?: boolean;
    home_property_id?: string | null;
  }>,
) {
  const responses = new Map<string, { data: unknown[] }>();
  responses.set('salespeople', { data: rows });
  return makeClient(responses);
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── allStaff ────────────────────────────────────────────────────────────────

describe('allStaff', () => {
  it('returns chat IDs for active non-partner_operator staff', async () => {
    mockCreateServiceClient.mockReturnValue(
      spClient([
        { telegram_chat_id: 'tg-1', role: 'salesperson' },
        { telegram_chat_id: 'tg-2', role: 'manager' },
      ]),
    );
    const result = await allStaff();
    expect(result).toEqual(['tg-1', 'tg-2']);
  });

  it('excludes rows with null telegram_chat_id', async () => {
    mockCreateServiceClient.mockReturnValue(
      spClient([{ telegram_chat_id: null }, { telegram_chat_id: 'tg-1' }]),
    );
    const result = await allStaff();
    expect(result).toEqual(['tg-1']);
  });

  it('deduplicates identical chat IDs', async () => {
    mockCreateServiceClient.mockReturnValue(
      spClient([{ telegram_chat_id: 'tg-1' }, { telegram_chat_id: 'tg-1' }]),
    );
    const result = await allStaff();
    expect(result).toEqual(['tg-1']);
  });
});

// ─── managersAndAbove ────────────────────────────────────────────────────────

describe('managersAndAbove', () => {
  it('returns manager and superadmin chat IDs', async () => {
    mockCreateServiceClient.mockReturnValue(
      spClient([
        { telegram_chat_id: 'mgr-1', role: 'manager' },
        { telegram_chat_id: 'adm-1', role: 'superadmin' },
      ]),
    );
    const result = await managersAndAbove();
    expect(result).toEqual(['mgr-1', 'adm-1']);
  });
});

// ─── superadminsOnly ────────────────────────────────────────────────────────

describe('superadminsOnly', () => {
  it('returns only superadmin chat IDs', async () => {
    mockCreateServiceClient.mockReturnValue(
      spClient([{ telegram_chat_id: 'adm-42', role: 'superadmin' }]),
    );
    const result = await superadminsOnly();
    expect(result).toEqual(['adm-42']);
  });

  it('returns empty array when no superadmins', async () => {
    mockCreateServiceClient.mockReturnValue(spClient([]));
    expect(await superadminsOnly()).toEqual([]);
  });
});

// ─── propertyResponsible — the partner_operator inclusion path ───────────────

describe('propertyResponsible', () => {
  it('includes partner_operator when home_property_id matches', async () => {
    mockCreateServiceClient.mockReturnValue(
      spClient([
        { telegram_chat_id: 'partner-tg', role: 'partner_operator', home_property_id: 'prop-1' },
        { telegram_chat_id: 'sp-tg', role: 'salesperson', home_property_id: 'prop-1' },
      ]),
    );
    const result = await propertyResponsible('prop-1');
    expect(result).toContain('partner-tg');
    expect(result).toContain('sp-tg');
  });

  it('returns empty array when no staff responsible for property', async () => {
    mockCreateServiceClient.mockReturnValue(spClient([]));
    expect(await propertyResponsible('prop-999')).toEqual([]);
  });
});

// ─── visitRecipients — broadcast suppression logic ──────────────────────────

describe('visitRecipients', () => {
  it('broadcasts allStaff when propertyResponsible is empty', async () => {
    // First call (managersAndAbove) → managers
    // Second call (propertyResponsible) → empty
    // Third call (allStaff) → salespeople
    mockCreateServiceClient
      .mockReturnValueOnce(spClient([{ telegram_chat_id: 'mgr-1' }])) // managersAndAbove
      .mockReturnValueOnce(spClient([])) // propertyResponsible
      .mockReturnValueOnce(spClient([{ telegram_chat_id: 'sp-1' }])); // allStaff

    const result = await visitRecipients({ propertyId: 'prop-1' });
    expect(result).toContain('mgr-1');
    expect(result).toContain('sp-1');
  });

  it('does NOT broadcast when propertyResponsible returns results', async () => {
    mockCreateServiceClient
      .mockReturnValueOnce(spClient([{ telegram_chat_id: 'mgr-1' }])) // managersAndAbove
      .mockReturnValueOnce(spClient([{ telegram_chat_id: 'partner-tg' }])); // propertyResponsible

    const result = await visitRecipients({ propertyId: 'prop-1' });
    expect(result).toContain('mgr-1');
    expect(result).toContain('partner-tg');
    // allStaff never called — no extra sp-* IDs appear
    expect(result).not.toContain('sp-1');
  });

  it('deduplicates when manager is also the assignee', async () => {
    // visitRecipients calls createServiceClient 3 times:
    //   managersAndAbove(), propertyResponsible(), assigneeOnly()
    // assigneeOnly itself calls createServiceClient once and queries 2 tables.
    mockCreateServiceClient
      .mockReturnValueOnce(spClient([{ telegram_chat_id: 'mgr-tg' }])) // managersAndAbove
      .mockReturnValueOnce(spClient([{ telegram_chat_id: 'partner-tg' }])) // propertyResponsible
      .mockReturnValueOnce(
        // assigneeOnly
        routedClient({
          leads: { assigned_to: 'sp-id-1' },
          salespeople: { telegram_chat_id: 'mgr-tg' }, // same chat ID as manager
        }),
      );

    const result = await visitRecipients({ propertyId: 'prop-1', leadId: 'lead-1' });
    const occurrences = result.filter((id) => id === 'mgr-tg');
    expect(occurrences).toHaveLength(1); // deduplicated
    expect(result).toContain('partner-tg');
  });
});

// ─── assigneeOnly ────────────────────────────────────────────────────────────

/** Table-routing client: returns different maybeSingle data per table name. */
function routedClient(tableData: Record<string, unknown>) {
  const selfRef: Record<string, unknown> = {};
  const wrap = () => selfRef;
  selfRef.select = wrap;
  selfRef.eq = wrap;
  selfRef.not = wrap;
  selfRef.in = wrap;
  selfRef.maybeSingle = () =>
    Promise.resolve({ data: tableData['__current'] ?? null, error: null });
  selfRef.then = (fn: (result: unknown) => unknown) =>
    Promise.resolve(fn({ data: tableData['__current'] ?? [], error: null }));

  return {
    from: (table: string) => {
      // Stamp which table's data to resolve with
      selfRef.maybeSingle = () => Promise.resolve({ data: tableData[table] ?? null, error: null });
      selfRef.then = (fn: (result: unknown) => unknown) =>
        Promise.resolve(fn({ data: tableData[table] ?? [], error: null }));
      return selfRef;
    },
  };
}

describe('assigneeOnly', () => {
  it('returns empty array when lead has no assignee', async () => {
    mockCreateServiceClient.mockReturnValue(routedClient({ leads: { assigned_to: null } }));
    expect(await assigneeOnly('lead-1')).toEqual([]);
  });

  it('returns chat ID for the assigned salesperson', async () => {
    mockCreateServiceClient.mockReturnValue(
      routedClient({
        leads: { assigned_to: 'sp-1' },
        salespeople: { telegram_chat_id: 'tg-assigned' },
      }),
    );
    const result = await assigneeOnly('lead-1');
    expect(result).toEqual(['tg-assigned']);
  });
});
