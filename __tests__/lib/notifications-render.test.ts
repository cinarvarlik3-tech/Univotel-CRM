/**
 * Unit tests for lib/notifications/render.ts
 * Covers all nine event kinds plus the new-message digest (length cap, UNCLAIMED prefix).
 */
import { describe, expect, it } from 'vitest';
import {
  renderWebhookFailure,
  renderVisitScheduled,
  renderVisitReminder,
  renderDealSigned,
  renderVisitResolutionPing,
  renderMoveInTomorrow,
  renderMoveInToday,
  renderNurtureNudge,
  renderNewMessageLine,
  renderNewMessageDigest,
  renderEvent,
} from '@/lib/notifications/render';

// ─── webhook_failure ────────────────────────────────────────────────────────

describe('renderWebhookFailure', () => {
  it('includes source, status, reasonCode, and errorMessage', () => {
    const msg = renderWebhookFailure({
      kind: 'webhook_failure',
      suppressible: false,
      source: 'chatwoot',
      status: 'rejected',
      reasonCode: 'schema_invalid',
      errorMessage: 'Expected string, received number',
      webhookLogId: 'log-abc',
    });
    expect(msg).toContain('[WEBHOOK FAILURE] chatwoot — rejected');
    expect(msg).toContain('Reason: schema_invalid');
    expect(msg).toContain('Expected string, received number');
  });

  it('falls back to "n/a" when reasonCode is null', () => {
    const msg = renderWebhookFailure({
      kind: 'webhook_failure',
      suppressible: false,
      source: 'netgsm',
      status: 'failed',
      reasonCode: null,
      errorMessage: 'DB timeout',
      webhookLogId: 'log-xyz',
    });
    expect(msg).toContain('Reason: n/a');
  });
});

// ─── visit_scheduled ─────────────────────────────────────────────────────────

describe('renderVisitScheduled', () => {
  it('includes lead name, property, and formatted date', () => {
    const msg = renderVisitScheduled({
      kind: 'visit_scheduled',
      suppressible: true,
      visitId: 'v1',
      leadId: 'l1',
      leadName: 'Ahmet Yılmaz',
      propertyId: 'p1',
      propertyName: 'Grand Yurt',
      visitAt: '2026-07-10T09:00:00+03:00',
    });
    expect(msg).toContain('[VISIT SCHEDULED]');
    expect(msg).toContain('Ahmet Yılmaz');
    expect(msg).toContain('Grand Yurt');
    expect(msg.length).toBeGreaterThan(40);
  });
});

// ─── visit_reminder ──────────────────────────────────────────────────────────

describe('renderVisitReminder', () => {
  it('includes reminder text, property, hour, and chatwoot URL', () => {
    const msg = renderVisitReminder({
      kind: 'visit_reminder',
      suppressible: true,
      visitId: 'v1',
      leadId: 'l1',
      leadName: 'Zeynep',
      propertyId: 'p1',
      propertyName: 'Uni Residence',
      visitAt: '2026-07-11T10:30:00+03:00',
      conversationId: 987,
    });
    expect(msg).toContain('[VISIT REMINDER]');
    expect(msg).toContain('Zeynep');
    expect(msg).toContain('Uni Residence');
    expect(msg).toContain('tomorrow');
    expect(msg).toContain('https://marketinguni.app/app/accounts/1/conversations/987');
  });

  it('omits URL when conversationId is null', () => {
    const msg = renderVisitReminder({
      kind: 'visit_reminder',
      suppressible: true,
      visitId: 'v1',
      leadId: 'l1',
      leadName: 'Zeynep',
      propertyId: 'p1',
      propertyName: 'Uni Residence',
      visitAt: '2026-07-11T10:30:00+03:00',
      conversationId: null,
    });
    expect(msg).not.toContain('https://');
  });
});

// ─── deal_signed ─────────────────────────────────────────────────────────────

describe('renderDealSigned', () => {
  it('includes lead, roomType, and propertyName', () => {
    const msg = renderDealSigned({
      kind: 'deal_signed',
      suppressible: true,
      leadId: 'l1',
      leadName: 'Can Aydın',
      propertyName: 'City Dorm',
      roomType: 'Deluxe Single',
    });
    expect(msg).toContain('[DEAL SIGNED]');
    expect(msg).toContain('Can Aydın');
    expect(msg).toContain('Deluxe Single');
    expect(msg).toContain('City Dorm');
    expect(msg).toContain('moved in');
  });
});

// ─── visit_resolution_ping ───────────────────────────────────────────────────

describe('renderVisitResolutionPing', () => {
  it('returns the blanket visit-log reminder text', () => {
    const msg = renderVisitResolutionPing();
    expect(msg).toContain('log your visits');
  });
});

// ─── move_in_tomorrow ────────────────────────────────────────────────────────

describe('renderMoveInTomorrow', () => {
  it('includes [MOVE-IN] prefix, lead, room, property, and "tomorrow"', () => {
    const msg = renderMoveInTomorrow({
      kind: 'move_in_tomorrow',
      suppressible: true,
      leadId: 'l1',
      leadName: 'Selin Kaya',
      propertyId: 'p1',
      propertyName: 'Campus View',
      roomType: 'Standard Double',
    });
    expect(msg).toContain('[MOVE-IN]');
    expect(msg).toContain('Selin Kaya');
    expect(msg).toContain('Standard Double');
    expect(msg).toContain('Campus View');
    expect(msg).toContain('tomorrow');
  });
});

// ─── move_in_today ───────────────────────────────────────────────────────────

describe('renderMoveInToday', () => {
  it('includes [MOVE-IN] prefix and "today"', () => {
    const msg = renderMoveInToday({
      kind: 'move_in_today',
      suppressible: true,
      leadId: 'l1',
      leadName: 'Ozan Demir',
      propertyId: 'p1',
      propertyName: 'Campus View',
      roomType: 'Suite',
    });
    expect(msg).toContain('[MOVE-IN]');
    expect(msg).toContain('Ozan Demir');
    expect(msg).toContain('today');
  });
});

// ─── nurture_nudge ───────────────────────────────────────────────────────────

describe('renderNurtureNudge', () => {
  it('returns the blanket task reminder text', () => {
    const msg = renderNurtureNudge();
    expect(msg).toContain('check your tasks');
  });
});

// ─── renderEvent dispatcher ──────────────────────────────────────────────────

describe('renderEvent', () => {
  it('dispatches to the correct renderer for each kind', () => {
    expect(
      renderEvent({
        kind: 'webhook_failure',
        suppressible: false,
        source: 'whatsapp',
        status: 'partial',
        reasonCode: null,
        errorMessage: 'oops',
        webhookLogId: 'x',
      }),
    ).toContain('[WEBHOOK FAILURE]');

    expect(
      renderEvent({
        kind: 'deal_signed',
        suppressible: true,
        leadId: 'l1',
        leadName: 'Ali',
        propertyName: 'Dorm',
        roomType: 'Suite',
      }),
    ).toContain('[DEAL SIGNED]');

    expect(
      renderEvent({
        kind: 'visit_resolution_ping',
        suppressible: true,
        recipientChatId: 'tg-1',
        unresolvedCount: 2,
      }),
    ).toContain('log your visits');

    expect(
      renderEvent({
        kind: 'nurture_nudge',
        suppressible: true,
        recipientChatId: 'tg-1',
      }),
    ).toContain('check your tasks');
  });
});

// ─── new_message line + digest ───────────────────────────────────────────────

describe('renderNewMessageLine', () => {
  it('produces "LeadName: snippet" with chatwoot URL', () => {
    const line = renderNewMessageLine('Erşan', 'Oda fiyatı nedir?', false, 42);
    expect(line).toBe(
      'Erşan: Oda fiyatı nedir?\nhttps://marketinguni.app/app/accounts/1/conversations/42',
    );
  });

  it('prepends [UNCLAIMED] prefix when isUnclaimed', () => {
    const line = renderNewMessageLine('Unknown', 'merhaba', true, null);
    expect(line).toMatch(/^\[UNCLAIMED\] Unknown: merhaba$/);
  });

  it('truncates long message bodies to 160 chars', () => {
    const long = 'x'.repeat(200);
    const line = renderNewMessageLine('Lead', long, false, null);
    expect(line).toContain('…');
    expect(line.split('\n')[0].length).toBeLessThan(180);
  });

  it('omits URL when conversationId is null', () => {
    const line = renderNewMessageLine('Lead', 'hi', false, null);
    expect(line).not.toContain('https://');
  });
});

describe('renderNewMessageDigest', () => {
  const baseRow = (n: number) => ({
    leadName: `Lead${n}`,
    messageSnippet: `Message from lead ${n}`,
    isUnclaimed: false,
    conversationId: n,
  });

  it('uses [LEAD MESSAGE] header for a single row', () => {
    const msg = renderNewMessageDigest([baseRow(1)]);
    expect(msg).toContain('[LEAD MESSAGE]');
    expect(msg).not.toContain('[NEW MESSAGES');
  });

  it('uses [NEW MESSAGES — N leads] header for multiple rows', () => {
    const msg = renderNewMessageDigest([baseRow(1), baseRow(2), baseRow(3)]);
    expect(msg).toContain('[NEW MESSAGES — 3 leads]');
  });

  it('appends "…and N more." when over the soft cap', () => {
    const manyRows = Array.from({ length: 200 }, (_, i) => ({
      leadName: `L${String(i).padStart(3, '0')}`,
      messageSnippet: 'x'.repeat(80),
      isUnclaimed: false,
      conversationId: i,
    }));
    const msg = renderNewMessageDigest(manyRows);
    expect(msg).toContain('…and');
    expect(msg).toContain('more.');
    expect(msg.length).toBeLessThanOrEqual(4096);
  });

  it('total output stays within Telegram 4096-char limit', () => {
    const manyRows = Array.from({ length: 500 }, (_, i) => ({
      leadName: `LeadWithALongName${i}`,
      messageSnippet: 'A'.repeat(160),
      isUnclaimed: false,
      conversationId: i,
    }));
    const msg = renderNewMessageDigest(manyRows);
    expect(msg.length).toBeLessThanOrEqual(4096);
  });

  it('UNCLAIMED prefix appears on pool leads', () => {
    const msg = renderNewMessageDigest([{ ...baseRow(1), isUnclaimed: true }]);
    expect(msg).toContain('[UNCLAIMED]');
  });
});
