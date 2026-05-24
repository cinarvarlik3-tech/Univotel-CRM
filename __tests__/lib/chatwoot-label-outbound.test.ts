/**
 * Unit tests for CRM → Chatwoot outbound label building.
 */
import { describe, expect, it } from 'vitest';
import {
  buildManagedLabelsFromCrm,
  mergeOutboundLabels,
  type CrmLabelState,
} from '@/lib/chatwoot/label-categories';

const baseState: CrmLabelState = {
  funnel_status: 'ziyaret',
  student_stage: 'pre-sinav',
  persona_type: 'ogrenci',
  special_state: null,
  message_from: 'whatsapp',
  lead_source: 'whatsapp',
  source_details: { referral_domain: 'ituyurt' },
  uni_year: '2-sinif',
  dorm_awaiting: ['kyk-sonuc-bekliyor'],
};

describe('buildManagedLabelsFromCrm', () => {
  it('includes all mapped CRM fields as label slugs', () => {
    const labels = buildManagedLabelsFromCrm(baseState);
    expect(labels).toContain('ziyaret');
    expect(labels).toContain('pre-sinav');
    expect(labels).toContain('ogrenci');
    expect(labels).toContain('whatsapp');
    expect(labels).toContain('ituyurt');
    expect(labels).toContain('2-sinif');
    expect(labels).toContain('kyk-sonuc-bekliyor');
  });

  it('omits non-mapped funnel values', () => {
    const labels = buildManagedLabelsFromCrm({
      ...baseState,
      funnel_status: 'manual',
    });
    expect(labels).not.toContain('manual');
  });
});

describe('mergeOutboundLabels', () => {
  it('preserves intent-only labels from Chatwoot', () => {
    const merged = mergeOutboundLabels(['acil', 'yeni'], baseState);
    expect(merged).toContain('acil');
    expect(merged).toContain('ziyaret');
    expect(merged).not.toContain('yeni');
  });
});
