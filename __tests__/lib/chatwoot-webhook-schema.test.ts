import { describe, expect, it } from 'vitest';
import { ChatwootPayloadSchema } from '@/types/webhooks';

describe('ChatwootPayloadSchema', () => {
  it('accepts message_created with null sender.identifier (agent outbound)', () => {
    const result = ChatwootPayloadSchema.safeParse({
      event: 'message_created',
      id: 1001,
      message_type: 'outgoing',
      sender: {
        id: 24,
        name: 'Batuhan',
        identifier: null,
        type: 'user',
      },
      conversation: { id: 55 },
      meta: {},
    });

    expect(result.success).toBe(true);
  });

  it('accepts message_created with contact sender and null optional fields', () => {
    const result = ChatwootPayloadSchema.safeParse({
      event: 'message_created',
      id: 1002,
      message_type: 'incoming',
      sender: {
        id: 10,
        name: 'Student',
        phone_number: '+905551234567',
        identifier: null,
        type: 'contact',
      },
      conversation: { id: 55 },
      meta: { sender: { phone_number: '+905551234567' } },
    });

    expect(result.success).toBe(true);
  });
});
