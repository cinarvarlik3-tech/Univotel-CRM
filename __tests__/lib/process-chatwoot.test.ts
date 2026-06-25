/**
 * Chatwoot webhook processor unit tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processChatwoot } from '@/lib/webhooks/process-chatwoot';

const createLeadFromWebhook = vi.fn();
const mergeChatwootIntoExistingLead = vi.fn();
const sendTelegramToManagers = vi.fn();

vi.mock('@/lib/leads/create-lead', () => ({
  createLeadFromWebhook: (...args: unknown[]) => createLeadFromWebhook(...args),
}));

vi.mock('@/lib/leads/merge-chatwoot-duplicate', () => ({
  mergeChatwootIntoExistingLead: (...args: unknown[]) => mergeChatwootIntoExistingLead(...args),
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramToManagers: (...args: unknown[]) => sendTelegramToManagers(...args),
}));

vi.mock('@/lib/tasks/auto-tasks', () => ({
  completeContactTasks: vi.fn().mockResolvedValue(undefined),
}));

const { mockCreateServiceClient, mockMaybeSingle } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockCreateServiceClient = vi.fn();
  return { mockCreateServiceClient, mockMaybeSingle };
});

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mockCreateServiceClient,
}));

function defaultSupabaseMock() {
  const terminalChain = {
    maybeSingle: mockMaybeSingle,
    like: () => ({
      limit: () => ({
        maybeSingle: mockMaybeSingle,
      }),
    }),
  };

  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => terminalChain,
            like: terminalChain.like,
            maybeSingle: mockMaybeSingle,
          }),
          like: () => ({
            limit: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      }),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }),
  };
}

interface DbCapture {
  op: 'update' | 'upsert' | 'insert';
  table: string;
  payload: Record<string, unknown>;
}

/** Lead row baseline matching LeadSyncRow shape. */
function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'lead-uuid-1',
    funnel_status: 'ziyaret-etti',
    student_stage: 'unknown',
    persona_type: null,
    special_state: null,
    message_from: 'whatsapp',
    lead_source: 'whatsapp',
    is_organic: true,
    deal_awaiting: false,
    source_details: { external_id: 'conv_124' },
    label_sync_source: null,
    label_synced_at: null,
    loss_reason: null,
    funnel_status_before_lost: null,
    ...overrides,
  };
}

/** Supabase mock that returns a fixed lead + lead_details and captures writes. */
function leadSyncMock(
  lead: Record<string, unknown>,
  details: Record<string, unknown> | null,
  captures: DbCapture[],
) {
  return () => ({
    from: (table: string) => {
      const result =
        table === 'lead_details' ? { data: details, error: null } : { data: lead, error: null };
      const chain: Record<string, unknown> = {
        eq: () => chain,
        like: () => chain,
        limit: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve(result),
      };
      return {
        select: () => chain,
        update: (payload: Record<string, unknown>) => {
          captures.push({ op: 'update', table, payload });
          return { eq: () => Promise.resolve({ error: null }) };
        },
        upsert: (payload: Record<string, unknown>) => {
          captures.push({ op: 'upsert', table, payload });
          return Promise.resolve({ error: null });
        },
        insert: (payload: Record<string, unknown>) => {
          captures.push({ op: 'insert', table, payload });
          return Promise.resolve({ error: null });
        },
      };
    },
  });
}

describe('processChatwoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createLeadFromWebhook.mockResolvedValue({
      type: 'created',
      uuid: 'lead-uuid-1',
      assignedTo: null,
    });
    mergeChatwootIntoExistingLead.mockResolvedValue(undefined);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockCreateServiceClient.mockImplementation(defaultSupabaseMock);
  });

  it('creates lead on message_created with meta.sender phone', async () => {
    await processChatwoot({
      event: 'message_created',
      id: 100,
      channel: 'Channel::Whatsapp',
      meta: { sender: { phone_number: '+905551234567', name: 'Ali' } },
      message: { id: 200 },
      conversation: { id: 50 },
    });

    expect(createLeadFromWebhook).toHaveBeenCalledOnce();
    expect(createLeadFromWebhook.mock.calls[0][0]).toMatchObject({
      identifierKind: 'phone',
      rawPhone: '+905551234567',
      leadName: 'Ali',
      leadSource: 'whatsapp',
    });
  });

  it('creates instagram lead from handle when phone is missing', async () => {
    await processChatwoot({
      event: 'message_created',
      id: 103,
      channel: 'Channel::Instagram',
      contact: {
        name: 'Ayse',
        additional_attributes: {
          social_instagram_user_name: 'Ayse.Student',
        },
      },
      message: { id: 203 },
      conversation: { id: 53 },
    });

    expect(createLeadFromWebhook).toHaveBeenCalledOnce();
    expect(createLeadFromWebhook.mock.calls[0][0]).toMatchObject({
      identifierKind: 'instagram',
      instagramHandle: 'Ayse.Student',
      leadName: 'Ayse',
      leadSource: 'instagram',
      messageFrom: 'instagram',
    });
  });

  it('creates instagram lead on reopen when only handle is present', async () => {
    await processChatwoot({
      event: 'conversation_updated',
      id: 62,
      channel: 'Channel::Instagram',
      contact: {
        additional_attributes: {
          social_instagram_user_name: 'reopened.user',
        },
      },
      conversation: { id: 72 },
      changed_attributes: [
        {
          status: { current_value: 'open', previous_value: 'resolved' },
        },
      ],
    });

    expect(createLeadFromWebhook).toHaveBeenCalledOnce();
    expect(createLeadFromWebhook.mock.calls[0][0]).toMatchObject({
      identifierKind: 'instagram',
      instagramHandle: 'reopened.user',
    });
  });

  it('creates lead when phone is only on contact', async () => {
    await processChatwoot({
      event: 'message_created',
      id: 101,
      channel: 'Channel::Whatsapp',
      contact: { phone_number: '+905559876543', name: 'Veli' },
      message: { id: 201 },
      conversation: { id: 51 },
    });

    expect(createLeadFromWebhook).toHaveBeenCalledOnce();
    expect(createLeadFromWebhook.mock.calls[0][0].rawPhone).toBe('+905559876543');
    expect(createLeadFromWebhook.mock.calls[0][0].leadName).toBe('Veli');
  });

  it('skips outgoing message_created', async () => {
    await processChatwoot({
      event: 'message_created',
      id: 102,
      message_type: 'outgoing',
      meta: { sender: { phone_number: '+905551234567' } },
      conversation: { id: 52 },
    });

    expect(createLeadFromWebhook).not.toHaveBeenCalled();
  });

  it('creates lead on conversation_updated reopen when no CRM lead exists', async () => {
    await processChatwoot({
      event: 'conversation_updated',
      id: 60,
      meta: { sender: { phone_number: '+905551111111' } },
      conversation: { id: 70 },
      changed_attributes: [
        {
          status: { current_value: 'open', previous_value: 'resolved' },
        },
      ],
    });

    expect(createLeadFromWebhook).toHaveBeenCalledOnce();
  });

  it('does not create lead on conversation_updated without contact identifier', async () => {
    await processChatwoot({
      event: 'conversation_updated',
      id: 61,
      conversation: { id: 71 },
      changed_attributes: [
        {
          status: { current_value: 'open', previous_value: 'resolved' },
        },
      ],
    });

    expect(createLeadFromWebhook).not.toHaveBeenCalled();
  });

  it('merges chatwoot metadata when phone already exists', async () => {
    createLeadFromWebhook.mockResolvedValue({
      type: 'duplicate',
      existingUuid: 'existing-uuid',
    });

    await processChatwoot({
      event: 'message_created',
      id: 224,
      channel: 'Channel::Whatsapp',
      meta: { sender: { phone_number: '+905551839644', name: 'Çınar Varlık' } },
      message: { id: 224 },
      conversation: { id: 51 },
    });

    expect(mergeChatwootIntoExistingLead).toHaveBeenCalledWith(
      'existing-uuid',
      expect.objectContaining({
        external_id: 'conv_51_msg_224',
        chatwoot_url: 'https://marketinguni.app/app/accounts/1/conversations/51',
      }),
      expect.objectContaining({ messageFrom: 'whatsapp' }),
    );
  });

  it('returns a rejected outcome on unknown/invalid event shape', async () => {
    const outcome = await processChatwoot({ event: 'contact_created', id: 1 });

    expect(createLeadFromWebhook).not.toHaveBeenCalled();
    // Alerting is centralized in runWithWebhookLog; the processor just reports the outcome.
    expect(outcome.status).toBe('rejected');
    expect(outcome.reasonCode).toBe('schema_invalid');
  });

  it('moves lead to lost and saves prior stage when kayip_nedeni is set', async () => {
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(
      leadSyncMock(leadRow({ funnel_status: 'ziyaret-etti' }), { university: null }, captures),
    );

    await processChatwoot({
      event: 'conversation_updated',
      id: 124,
      conversation: { id: 124 },
      changed_attributes: [
        { custom_attributes: { current_value: { kayip_nedeni: 'Rakip' }, previous_value: {} } },
      ],
    });

    const leadUpdate = captures.find(
      (c) => c.op === 'update' && c.table === 'leads' && 'funnel_status' in c.payload,
    );
    expect(leadUpdate?.payload).toMatchObject({
      funnel_status: 'lost',
      loss_reason: 'competitor',
      funnel_status_before_lost: 'ziyaret-etti',
    });
  });

  it('restores prior stage when kayip_nedeni is cleared on a lost lead', async () => {
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(
      leadSyncMock(
        leadRow({
          funnel_status: 'lost',
          loss_reason: 'competitor',
          funnel_status_before_lost: 'ziyaret-etti',
        }),
        { university: null },
        captures,
      ),
    );

    await processChatwoot({
      event: 'conversation_updated',
      id: 124,
      conversation: { id: 124 },
      changed_attributes: [
        { custom_attributes: { current_value: {}, previous_value: { kayip_nedeni: 'Rakip' } } },
      ],
    });

    const leadUpdate = captures.find(
      (c) => c.op === 'update' && c.table === 'leads' && 'funnel_status' in c.payload,
    );
    expect(leadUpdate?.payload).toMatchObject({
      funnel_status: 'ziyaret-etti',
      loss_reason: null,
      funnel_status_before_lost: null,
    });
  });

  it('moves lead to lost when the kayıp label is added', async () => {
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(
      leadSyncMock(leadRow({ funnel_status: 'arandi' }), { university: null }, captures),
    );

    await processChatwoot({
      event: 'conversation_updated',
      id: 124,
      conversation: { id: 124 },
      changed_attributes: [{ label_list: { current_value: ['kayıp'], previous_value: [] } }],
    });

    const leadUpdate = captures.find(
      (c) => c.op === 'update' && c.table === 'leads' && 'funnel_status' in c.payload,
    );
    expect(leadUpdate?.payload).toMatchObject({
      funnel_status: 'lost',
      funnel_status_before_lost: 'arandi',
    });
  });

  it('uses another funnel label on removal instead of defaulting to yeni', async () => {
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(
      leadSyncMock(leadRow({ funnel_status: 'ziyaret-etti' }), { university: null }, captures),
    );

    await processChatwoot({
      event: 'conversation_updated',
      id: 124,
      conversation: { id: 124 },
      changed_attributes: [
        {
          label_list: {
            current_value: ['arandi', 'pre-sinav'],
            previous_value: ['arandi', 'ziyaret-etti', 'pre-sinav'],
          },
        },
      ],
    });

    const leadUpdate = captures.find(
      (c) => c.op === 'update' && c.table === 'leads' && 'funnel_status' in c.payload,
    );
    expect(leadUpdate?.payload).toMatchObject({ funnel_status: 'arandi' });
  });

  it('writes ogrenci_cinsiyeti to lead_details.student_gender', async () => {
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(
      leadSyncMock(leadRow({ funnel_status: 'arandi' }), { student_gender: null }, captures),
    );

    await processChatwoot({
      event: 'conversation_updated',
      id: 124,
      conversation: { id: 124 },
      changed_attributes: [
        {
          custom_attributes: {
            current_value: { ogrenci_cinsiyeti: 'Kız' },
            previous_value: {},
          },
        },
      ],
    });

    const upsert = captures.find((c) => c.op === 'upsert' && c.table === 'lead_details');
    expect(upsert?.payload).toMatchObject({
      lead_uuid: 'lead-uuid-1',
      student_gender: 'female',
    });
  });

  it('writes an outgoing lead_messages row from a flattened message_created payload', async () => {
    // Real Chatwoot shape: the message is flattened onto the top level (id, sender,
    // message_type string, content, ISO created_at) and repeated under
    // conversation.messages[] with the integer message_type + unix created_at.
    // There is NO nested `message` object.
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(leadSyncMock(leadRow(), null, captures));

    await processChatwoot({
      event: 'message_created',
      id: 4017,
      sender: { id: 2, name: 'Çınar Varlık', type: 'user' },
      content: 'İncelemeye vaktiniz oldu mu efendim?',
      message_type: 'outgoing',
      created_at: '2026-06-25T09:27:49.012Z',
      conversation: {
        id: 547,
        messages: [
          {
            id: 4017,
            message_type: 1,
            created_at: 1782379669,
            private: false,
            content: 'İncelemeye vaktiniz oldu mu efendim?',
            sender: { id: 2, name: 'Çınar Varlık', type: 'user' },
          },
        ],
      },
    });

    const upsert = captures.find((c) => c.op === 'upsert' && c.table === 'lead_messages');
    expect(upsert?.payload).toMatchObject({
      chatwoot_message_id: 4017,
      chatwoot_conversation_id: 547,
      direction: 'outgoing',
      sender_agent_id: '2',
      sender_type: 'user',
      content: 'İncelemeye vaktiniz oldu mu efendim?',
    });
  });

  it('writes an incoming lead_messages row from a conversation_created top-level messages[]', async () => {
    // conversation_created carries the message in a top-level `messages` array.
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(leadSyncMock(leadRow(), null, captures));

    await processChatwoot({
      event: 'conversation_created',
      id: 556,
      channel: 'Channel::Whatsapp',
      meta: { sender: { id: 548, name: 'Fatih', type: 'contact', phone_number: '+905315895918' } },
      messages: [
        {
          id: 4005,
          message_type: 0,
          created_at: 1782362673,
          private: false,
          content: 'Merhabalar Univotel!',
          sender: { id: 548, name: 'Fatih', type: 'contact' },
        },
      ],
    });

    const upsert = captures.find((c) => c.op === 'upsert' && c.table === 'lead_messages');
    expect(upsert?.payload).toMatchObject({
      chatwoot_message_id: 4005,
      direction: 'incoming',
      sender_agent_id: null,
      sender_type: 'contact',
    });
  });

  it('writes a changed custom attribute to lead_details', async () => {
    const captures: DbCapture[] = [];
    mockCreateServiceClient.mockImplementation(
      leadSyncMock(leadRow({ funnel_status: 'arandi' }), { university: null }, captures),
    );

    await processChatwoot({
      event: 'conversation_updated',
      id: 124,
      conversation: { id: 124 },
      changed_attributes: [
        {
          custom_attributes: {
            current_value: { university: 'Boğaziçi - Ana Kampüs' },
            previous_value: {},
          },
        },
      ],
    });

    const upsert = captures.find((c) => c.op === 'upsert' && c.table === 'lead_details');
    expect(upsert?.payload).toMatchObject({
      lead_uuid: 'lead-uuid-1',
      university: 'Boğaziçi - Ana Kampüs',
      school_shortname: 'Boğaziçi',
    });
    // A pure custom-attribute edit must not touch funnel_status.
    const funnelUpdate = captures.find(
      (c) => c.op === 'update' && c.table === 'leads' && 'funnel_status' in c.payload,
    );
    expect(funnelUpdate).toBeUndefined();
  });
});
