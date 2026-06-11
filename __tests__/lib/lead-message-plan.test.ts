/**
 * Unit tests for the lead-message notify planner (pure suppression + routing logic).
 */
import { describe, expect, it } from 'vitest';
import {
  buildDigestText,
  buildLeadMessageText,
  planLeadMessageNotifications,
  type PendingLeadMessage,
  type PlanInput,
  type PlanLead,
  type PlanSalesperson,
} from '@/lib/notifications/lead-message-plan';

// 10:00 Istanbul (UTC+3) — inside the default 09:00–18:00 shift.
const NOW = new Date('2026-06-05T07:00:00Z');

function msg(
  over: Partial<PendingLeadMessage> & { id: string; leadUuid: string },
): PendingLeadMessage {
  return {
    content: 'Oda fiyatı nedir?',
    senderName: 'Erşan',
    createdAt: '2026-06-05T06:59:00Z',
    ...over,
  };
}

function lead(over: Partial<PlanLead> & { uuid: string }): PlanLead {
  return {
    leadName: 'Erşan Y.',
    leadPhone: '+905551112233',
    assignedTo: 'sp-1',
    chatwootUrl: 'https://cw.example/app/accounts/1/conversations/42',
    ...over,
  };
}

function sp(over: Partial<PlanSalesperson> & { id: string }): PlanSalesperson {
  return {
    fullName: 'Gamze',
    telegramChatId: 'tg-1',
    chatwootUserId: 100,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    ...over,
  };
}

function input(over: Partial<PlanInput>): PlanInput {
  return {
    now: NOW,
    messages: [],
    leads: new Map(),
    salespeople: new Map(),
    activeChatwootUserIds: new Set(),
    leadsInCooldown: new Set(),
    maxLeadsPerTick: 8,
    ...over,
  };
}

describe('planLeadMessageNotifications', () => {
  it('sends one ping for an eligible lead and marks the message processed', () => {
    const result = planLeadMessageNotifications(
      input({
        messages: [msg({ id: 'm1', leadUuid: 'l1' })],
        leads: new Map([['l1', lead({ uuid: 'l1' })]]),
        salespeople: new Map([['sp-1', sp({ id: 'sp-1' })]]),
      }),
    );

    expect(result.sends).toHaveLength(1);
    expect(result.sends[0].chatId).toBe('tg-1');
    expect(result.sends[0].text).toContain('Erşan');
    expect(result.sends[0].text).toContain('Oda fiyatı');
    expect(result.sends[0].leadUuids).toEqual(['l1']);
    expect(result.markNotifiedIds).toEqual(['m1']);
    expect(result.stats.sent).toBe(1);
  });

  it('suppresses all pings when the rep is active in Chatwoot, and marks them', () => {
    const result = planLeadMessageNotifications(
      input({
        messages: [msg({ id: 'm1', leadUuid: 'l1' })],
        leads: new Map([['l1', lead({ uuid: 'l1' })]]),
        salespeople: new Map([['sp-1', sp({ id: 'sp-1', chatwootUserId: 100 })]]),
        activeChatwootUserIds: new Set([100]),
      }),
    );

    expect(result.sends).toHaveLength(0);
    expect(result.markNotifiedIds).toEqual(['m1']);
    expect(result.stats.suppressedActive).toBe(1);
  });

  it('suppresses pings outside the shift window, and marks them', () => {
    const result = planLeadMessageNotifications(
      input({
        // NOW is 10:00 Istanbul; this shift starts at 11:00, so we are outside.
        messages: [msg({ id: 'm1', leadUuid: 'l1' })],
        leads: new Map([['l1', lead({ uuid: 'l1' })]]),
        salespeople: new Map([
          ['sp-1', sp({ id: 'sp-1', shiftStart: '11:00', shiftEnd: '18:00' })],
        ]),
      }),
    );

    expect(result.sends).toHaveLength(0);
    expect(result.markNotifiedIds).toEqual(['m1']);
    expect(result.stats.suppressedShift).toBe(1);
  });

  it('skips a lead in cooldown without marking it (so it retries later)', () => {
    const result = planLeadMessageNotifications(
      input({
        messages: [msg({ id: 'm1', leadUuid: 'l1' })],
        leads: new Map([['l1', lead({ uuid: 'l1' })]]),
        salespeople: new Map([['sp-1', sp({ id: 'sp-1' })]]),
        leadsInCooldown: new Set(['l1']),
      }),
    );

    expect(result.sends).toHaveLength(0);
    expect(result.markNotifiedIds).toEqual([]);
    expect(result.stats.cooldownSkipped).toBe(1);
  });

  it('drops messages for unassigned or unlinked leads, marking them', () => {
    const result = planLeadMessageNotifications(
      input({
        messages: [
          msg({ id: 'm1', leadUuid: 'l1' }), // unassigned
          msg({ id: 'm2', leadUuid: 'l2' }), // assigned but rep unlinked
        ],
        leads: new Map([
          ['l1', lead({ uuid: 'l1', assignedTo: null })],
          ['l2', lead({ uuid: 'l2', assignedTo: 'sp-2' })],
        ]),
        salespeople: new Map([['sp-2', sp({ id: 'sp-2', telegramChatId: null })]]),
      }),
    );

    expect(result.sends).toHaveLength(0);
    expect(result.markNotifiedIds.sort()).toEqual(['m1', 'm2']);
    expect(result.stats.dropped).toBe(2);
  });

  it('coalesces multiple messages from one lead into a single ping', () => {
    const result = planLeadMessageNotifications(
      input({
        messages: [
          msg({ id: 'm1', leadUuid: 'l1', content: 'Merhaba' }),
          msg({ id: 'm2', leadUuid: 'l1', content: 'Oda fiyatı nedir?' }),
        ],
        leads: new Map([['l1', lead({ uuid: 'l1' })]]),
        salespeople: new Map([['sp-1', sp({ id: 'sp-1' })]]),
      }),
    );

    expect(result.sends).toHaveLength(1);
    expect(result.sends[0].text).toContain('2 yeni mesaj');
    expect(result.sends[0].text).toContain('Oda fiyatı nedir?'); // newest content
    expect(result.markNotifiedIds.sort()).toEqual(['m1', 'm2']);
    expect(result.stats.sent).toBe(1);
  });

  it('collapses into a digest when eligible leads exceed the per-tick cap', () => {
    const result = planLeadMessageNotifications(
      input({
        maxLeadsPerTick: 1,
        messages: [
          msg({ id: 'm1', leadUuid: 'l1', senderName: 'Ada' }),
          msg({ id: 'm2', leadUuid: 'l2', senderName: 'Bora' }),
        ],
        leads: new Map([
          ['l1', lead({ uuid: 'l1' })],
          ['l2', lead({ uuid: 'l2' })],
        ]),
        salespeople: new Map([['sp-1', sp({ id: 'sp-1' })]]),
      }),
    );

    expect(result.sends).toHaveLength(1);
    expect(result.sends[0].text).toContain('2 müşteriden');
    expect(result.sends[0].leadUuids.sort()).toEqual(['l1', 'l2']);
    expect(result.markNotifiedIds.sort()).toEqual(['m1', 'm2']);
    expect(result.stats.sent).toBe(2);
  });
});

describe('message builders', () => {
  it('renders a single-message preview with a deep link', () => {
    const text = buildLeadMessageText('Erşan', 'Oda fiyatı nedir?', 1, 'https://cw/x');
    expect(text).toBe('💬 Erşan: "Oda fiyatı nedir?"\nhttps://cw/x');
  });

  it('renders a coalesced preview without a link', () => {
    const text = buildLeadMessageText('Erşan', 'Son mesaj', 3, null);
    expect(text).toBe('💬 Erşan — 3 yeni mesaj:\n"Son mesaj"');
  });

  it('renders a digest with overflow count', () => {
    const text = buildDigestText(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(text).toBe('💬 7 müşteriden yeni mesaj: A, B, C, D, E +2');
  });
});
