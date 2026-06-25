/**
 * NetGSM CDR processor unit tests.
 *
 * Rule under test: a CDR is recorded ONLY when the company line (0212 909 52 44,
 * in any format) is the caller or called party. The other leg is the customer —
 * matched to a lead (write CDR) or used to create a new lead. Calls that don't
 * involve the company number (e.g. to a staff personal line on the same santral)
 * are ignored.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processNetGsm } from '@/lib/webhooks/process-netgsm';

const createLeadFromWebhook = vi.fn();
const updateLeadRecord = vi.fn();
const sendTelegramToManagers = vi.fn();

vi.mock('@/lib/leads/create-lead', () => ({
  createLeadFromWebhook: (...args: unknown[]) => createLeadFromWebhook(...args),
}));

vi.mock('@/lib/leads/update-lead', () => ({
  updateLeadRecord: (...args: unknown[]) => updateLeadRecord(...args),
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramToManagers: (...args: unknown[]) => sendTelegramToManagers(...args),
  sendTelegramAlert: (...args: unknown[]) => sendTelegramToManagers(...args),
}));

const { mockCreateServiceClient } = vi.hoisted(() => ({ mockCreateServiceClient: vi.fn() }));

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mockCreateServiceClient,
}));

interface DbCapture {
  op: 'insert' | 'update';
  table: string;
  payload: Record<string, unknown>;
}

// Shared across the (multiple) createServiceClient() calls within one processNetGsm run.
let captures: DbCapture[] = [];
let leadLookupResult: { data: Record<string, unknown> | null; error: null } = {
  data: null,
  error: null,
};

/** Minimal Supabase mock: leads lookup returns leadLookupResult; writes are captured. */
function netgsmDbMock() {
  return {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve(leadLookupResult),
        insert: (payload: Record<string, unknown>) => {
          captures.push({ op: 'insert', table, payload });
          return Promise.resolve({ error: null });
        },
        update: (payload: Record<string, unknown>) => {
          captures.push({ op: 'update', table, payload });
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
      return chain;
    },
    rpc: () => Promise.resolve({ error: null }),
  };
}

/** A matched lead row (shape used by findLeadByPhone). */
function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'lead-uuid-1',
    lead_name: 'Test Lead',
    is_archived: false,
    funnel_status: 'yeni',
    assigned_to: null,
    loss_reason: null,
    funnel_status_before_lost: null,
    ...overrides,
  };
}

/** Builds a CDR payload. `arayan` = caller, `aranan` = called number. */
function cdr(arayan: string, aranan: string, sure = 30) {
  return { scenario: 'cdr', arayan, aranan, sure };
}

const COMPANY = '2129095244';
const CUSTOMER = '05551234567';

// Personal numbers that must never become leads (used here as skip-case fixtures).
const STAFF_NUMBERS = ['05551839644', '05445548344', '05303699539'];

function contactInserts() {
  return captures.filter((c) => c.op === 'insert' && c.table === 'contact_history');
}

beforeEach(() => {
  vi.clearAllMocks();
  captures = [];
  leadLookupResult = { data: null, error: null };
  mockCreateServiceClient.mockImplementation(() => netgsmDbMock());
});

describe('processNetGsm — CDR tracking rule', () => {
  it('inbound call to the company line from an existing lead writes a CDR call to that lead', async () => {
    leadLookupResult = { data: leadRow(), error: null };

    const outcome = await processNetGsm(cdr(CUSTOMER, COMPANY));

    const inserts = contactInserts();
    expect(inserts).toHaveLength(1);
    expect(inserts[0].payload).toMatchObject({
      lead_uuid: 'lead-uuid-1',
      interaction_type: 'call',
      interaction_source: 'netgsm',
    });
    expect((inserts[0].payload.metadata as Record<string, unknown>).direction).toBe('inbound');
    expect(createLeadFromWebhook).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ status: 'success', reasonCode: 'cdr_written' });
  });

  it('inbound call to the company line from an unknown number creates a new lead', async () => {
    leadLookupResult = { data: null, error: null };

    const outcome = await processNetGsm(cdr(CUSTOMER, COMPANY));

    expect(contactInserts()).toHaveLength(0);
    expect(createLeadFromWebhook).toHaveBeenCalledTimes(1);
    expect(createLeadFromWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ rawPhone: CUSTOMER, leadSource: 'netgsm_call' }),
    );
    expect(outcome).toMatchObject({ status: 'success', reasonCode: 'lead_created' });
  });

  it('outbound call from the company line to an existing lead writes an outbound CDR', async () => {
    leadLookupResult = { data: leadRow(), error: null };

    await processNetGsm(cdr(COMPANY, CUSTOMER));

    const inserts = contactInserts();
    expect(inserts).toHaveLength(1);
    expect((inserts[0].payload.metadata as Record<string, unknown>).direction).toBe('outbound');
    expect(createLeadFromWebhook).not.toHaveBeenCalled();
  });

  it.each([
    '2129095244',
    '02129095244',
    '+902129095244',
    '902129095244',
    '0 212 909 52 44',
    '+90 212 909 52 44',
  ])('recognizes the company line in format "%s"', async (companyVariant) => {
    leadLookupResult = { data: leadRow(), error: null };

    await processNetGsm(cdr(CUSTOMER, companyVariant));

    expect(contactInserts()).toHaveLength(1);
    expect(createLeadFromWebhook).not.toHaveBeenCalled();
  });

  it.each(STAFF_NUMBERS)(
    'ignores a call to staff personal number %s (company line not a leg) — no lead, no CDR',
    async (staffNumber) => {
      leadLookupResult = { data: leadRow(), error: null };

      const outcome = await processNetGsm(cdr(CUSTOMER, staffNumber));

      expect(contactInserts()).toHaveLength(0);
      expect(createLeadFromWebhook).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({ status: 'ignored', reasonCode: 'not_company_line' });
    },
  );

  it('ignores a customer-to-customer call where neither leg is the company line', async () => {
    leadLookupResult = { data: null, error: null };

    const outcome = await processNetGsm(cdr(CUSTOMER, '05559998877'));

    expect(contactInserts()).toHaveLength(0);
    expect(createLeadFromWebhook).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ status: 'ignored', reasonCode: 'not_company_line' });
  });
});
