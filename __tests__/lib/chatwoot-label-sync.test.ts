/**
 * Unit tests for Chatwoot label → CRM field mapping helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  CHATWOOT_INTENT_ONLY_LABELS,
  CHATWOOT_LABEL_IS_ORGANIC,
  getLabelFieldTargets,
  LABEL_TO_FIELD_MAP,
} from '@/lib/constants';
import { ChatwootConversationUpdatedSchema } from '@/types/webhooks';

describe('Chatwoot label mapping', () => {
  it('LABEL_TO_FIELD_MAP includes all funnel labels', () => {
    expect(getLabelFieldTargets('yeni')).toEqual([{ table: 'leads', field: 'funnel_status' }]);
    expect(getLabelFieldTargets('aranacak')).toEqual([{ table: 'leads', field: 'funnel_status' }]);
  });

  it('paid source labels map to lead_source and is_organic', () => {
    expect(getLabelFieldTargets('google-ads')).toEqual([
      { table: 'leads', field: 'lead_source' },
      { table: 'leads', field: 'is_organic' },
    ]);
    expect(CHATWOOT_LABEL_IS_ORGANIC['google-ads']).toBe(false);
    expect(CHATWOOT_LABEL_IS_ORGANIC['google-maps']).toBe(true);
  });

  it('intent-only labels map to none', () => {
    for (const label of CHATWOOT_INTENT_ONLY_LABELS) {
      expect(getLabelFieldTargets(label)).toEqual([{ table: 'none' }]);
    }
  });

  it('dorm labels map to lead_details.dorm_awaiting', () => {
    expect(getLabelFieldTargets('kyk-sonuc-bekliyor')).toEqual([
      { table: 'lead_details', field: 'dorm_awaiting' },
    ]);
  });

  it('referral domain labels map to source_details', () => {
    expect(getLabelFieldTargets('ituyurt')).toEqual([
      { table: 'source_details', field: 'referral_domain' },
    ]);
  });

  it('every key in LABEL_TO_FIELD_MAP resolves', () => {
    expect(Object.keys(LABEL_TO_FIELD_MAP).length).toBeGreaterThan(20);
  });
});

describe('ChatwootConversationUpdatedSchema', () => {
  it('accepts conversation_updated with changed_attributes labels', () => {
    const payload = {
      event: 'conversation_updated',
      id: 42,
      conversation: { id: 99 },
      changed_attributes: [
        {
          labels: {
            current_value: ['yeni', 'pre-sinav'],
            previous_value: ['yeni'],
          },
        },
      ],
    };

    const parsed = ChatwootConversationUpdatedSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('accepts conversation_updated with label_list in changed_attributes', () => {
    const payload = {
      event: 'conversation_updated',
      id: 52,
      conversation: { id: 52 },
      changed_attributes: [
        {
          label_list: {
            current_value: ['ziyaret'],
            previous_value: [],
          },
        },
      ],
    };

    const parsed = ChatwootConversationUpdatedSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });
});
