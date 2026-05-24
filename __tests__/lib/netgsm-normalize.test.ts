/**
 * NetGSM payload normalization tests (official CDR example from Netsantral docs).
 */
import { describe, expect, it } from 'vitest';
import { normalizeNetGsmPayload } from '@/lib/webhooks/normalize-netgsm-payload';

describe('normalizeNetGsmPayload', () => {
  it('parses official CDR scenario payload', () => {
    const payload = {
      bas: '2021-01-27 16:05:38',
      kimlik: '18664123456',
      arayan: '05321234567',
      aranan: '85030xxxxx-queue-MusteriHizmetleri',
      sure: 164,
      scenario: 'cdr',
      timestamp: '1652080580926',
      token: 'my-secret',
    };

    const result = normalizeNetGsmPayload(payload);

    expect(result.callerPhone).toBe('05321234567');
    expect(result.calledNumber).toContain('85030');
    expect(result.externalId).toBe('18664123456');
    expect(result.durationSeconds).toBe(164);
    expect(result.shouldCreateLead).toBe(true);
  });

  it('parses santral dinleme inbound with unique_id', () => {
    const payload = {
      pbx_num: '850304XXXX',
      unique_id: '1428481992.3556',
      scenario: 'Inbound_call',
      customer_num: '05329876543',
      timestamp: '1652080580926',
      talktime: 45,
    };

    const result = normalizeNetGsmPayload(payload);

    expect(result.callerPhone).toBe('05329876543');
    expect(result.externalId).toBe('1428481992.3556');
    expect(result.shouldCreateLead).toBe(true);
  });

  it('skips queue-only events without call outcome', () => {
    const payload = {
      queue_name: '850XXXXXXX-queue-Destek',
      scenario: 'Queue',
      timestamp: '1652080580926',
    };

    const result = normalizeNetGsmPayload(payload);

    expect(result.shouldCreateLead).toBe(false);
  });
});
