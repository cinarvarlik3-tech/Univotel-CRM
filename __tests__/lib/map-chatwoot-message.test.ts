import { describe, expect, it } from 'vitest';
import {
  collectConversationIdsForLead,
  buildConversationLeadMap,
} from '@/lib/import/build-conversation-lead-map';
import {
  mapChatwootMessage,
  mapChatwootMessageType,
  resolveAgentDisplayName,
} from '@/lib/import/map-chatwoot-message';
import type { ChatwootMessageRow, ChatwootUserRow } from '@/lib/import/types';

describe('mapChatwootMessageType', () => {
  it('maps Chatwoot numeric types', () => {
    expect(mapChatwootMessageType(0)).toBe('incoming');
    expect(mapChatwootMessageType(1)).toBe('outgoing');
    expect(mapChatwootMessageType(2)).toBe('activity');
    expect(mapChatwootMessageType(99)).toBeNull();
  });
});

describe('resolveAgentDisplayName', () => {
  it('prefers display_name over name', () => {
    expect(resolveAgentDisplayName({ id: 1, name: 'omer', display_name: 'Ömer' })).toBe('Ömer');
  });

  it('falls back to name', () => {
    expect(resolveAgentDisplayName({ id: 1, name: 'Emre sefa kadirhan', display_name: null })).toBe(
      'Emre sefa kadirhan',
    );
  });
});

describe('mapChatwootMessage', () => {
  const users = new Map<number, ChatwootUserRow>([
    [24, { id: 24, name: 'Batuhan', display_name: 'Batuhan' }],
  ]);

  it('maps inbound with lead name', () => {
    const message: ChatwootMessageRow = {
      id: 1,
      content: 'Merhaba',
      conversation_id: 10,
      message_type: 0,
      created_at: '2024-01-01T00:00:00Z',
      sender_type: 'Contact',
      sender_id: 5,
      private: false,
    };

    const mapped = mapChatwootMessage(message, users, 'Ahmet Yilmaz');
    expect(mapped?.message_type).toBe('incoming');
    expect(mapped?.sender_name).toBe('Ahmet Yilmaz');
    expect(mapped?.sender_type).toBe('contact');
  });

  it('maps outbound with agent name from users table', () => {
    const message: ChatwootMessageRow = {
      id: 2,
      content: 'Tabii',
      conversation_id: 10,
      message_type: 1,
      created_at: '2024-01-01T00:01:00Z',
      sender_type: 'User',
      sender_id: 24,
      private: false,
    };

    const mapped = mapChatwootMessage(message, users, 'Ahmet');
    expect(mapped?.message_type).toBe('outgoing');
    expect(mapped?.sender_name).toBe('Batuhan');
    expect(mapped?.sender_type).toBe('user');
  });

  it('maps activity as system', () => {
    const message: ChatwootMessageRow = {
      id: 3,
      content: 'Ömer assigned this conversation',
      conversation_id: 10,
      message_type: 2,
      created_at: '2024-01-01T00:02:00Z',
      sender_type: null,
      sender_id: null,
      private: false,
    };

    const mapped = mapChatwootMessage(message, users, null);
    expect(mapped?.message_type).toBe('activity');
    expect(mapped?.sender_type).toBe('system');
  });
});

describe('buildConversationLeadMap', () => {
  it('maps primary and merged conversation IDs to lead uuid', () => {
    const leads = [
      {
        uuid: 'lead-a',
        lead_name: 'Test',
        chatwoot_conversation_id: 100,
        source_details: {
          import_meta: { merged_conversation_ids: [101, 102] },
        },
      },
    ];

    const map = buildConversationLeadMap(leads);
    expect(map.conversationToLead.get(100)).toBe('lead-a');
    expect(map.conversationToLead.get(101)).toBe('lead-a');
    expect(map.conversationToLead.get(102)).toBe('lead-a');
  });
});

describe('collectConversationIdsForLead', () => {
  it('deduplicates primary and merged ids', () => {
    const ids = collectConversationIdsForLead({
      uuid: 'x',
      lead_name: null,
      chatwoot_conversation_id: 5,
      source_details: { import_meta: { merged_conversation_ids: [5, 6] } },
    });
    expect(ids.sort()).toEqual([5, 6]);
  });
});
