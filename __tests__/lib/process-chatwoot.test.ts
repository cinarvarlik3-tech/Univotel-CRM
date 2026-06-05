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

  it('alerts on unknown event shape', async () => {
    await processChatwoot({ event: 'contact_created', id: 1 });

    expect(createLeadFromWebhook).not.toHaveBeenCalled();
    expect(sendTelegramToManagers).toHaveBeenCalled();
  });
});
