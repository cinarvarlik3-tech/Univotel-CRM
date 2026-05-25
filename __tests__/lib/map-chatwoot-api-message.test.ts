import { describe, expect, it } from 'vitest';
import {
  mapChatwootApiMessage,
  normalizeApiMessageType,
  parseChatwootApiTimestamp,
} from '@/lib/chatwoot/map-api-message';
import type { ChatwootApiAgent } from '@/lib/chatwoot/types';

describe('normalizeApiMessageType', () => {
  it('maps string and numeric types', () => {
    expect(normalizeApiMessageType(0)).toBe(0);
    expect(normalizeApiMessageType('incoming')).toBe(0);
    expect(normalizeApiMessageType('outgoing')).toBe(1);
    expect(normalizeApiMessageType('activity')).toBe(2);
  });
});

describe('parseChatwootApiTimestamp', () => {
  it('parses unix seconds', () => {
    const iso = parseChatwootApiTimestamp(1_700_000_000);
    expect(iso).toContain('2023');
  });

  it('parses ISO strings', () => {
    expect(parseChatwootApiTimestamp('2024-06-01T12:00:00Z')).toBe('2024-06-01T12:00:00.000Z');
  });
});

describe('mapChatwootApiMessage', () => {
  const agents = new Map<number, ChatwootApiAgent>([
    [24, { id: 24, name: 'Batuhan', email: null }],
  ]);

  it('maps incoming with sender name', () => {
    const mapped = mapChatwootApiMessage(
      {
        id: 10,
        content: 'Merhaba',
        message_type: 'incoming',
        created_at: '2024-01-01T10:00:00Z',
        sender: { id: 5, name: 'Ali', type: 'contact' },
      },
      99,
      agents,
      'Fallback',
    );
    expect(mapped?.message_type).toBe('incoming');
    expect(mapped?.sender_name).toBe('Ali');
  });

  it('maps outgoing with agent from directory', () => {
    const mapped = mapChatwootApiMessage(
      {
        id: 11,
        content: 'Tabii',
        message_type: 1,
        created_at: 1_700_000_100,
        sender: { id: 24, type: 'user' },
      },
      99,
      agents,
      null,
    );
    expect(mapped?.message_type).toBe('outgoing');
    expect(mapped?.sender_name).toBe('Batuhan');
  });
});
