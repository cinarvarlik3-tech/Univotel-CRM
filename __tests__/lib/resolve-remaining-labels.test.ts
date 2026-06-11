import { describe, expect, it } from 'vitest';
import {
  defaultLabelFieldValue,
  resolveDormAwaitingFromRemainingLabels,
  resolveFieldAfterLabelRemoval,
  resolveValueFromRemainingLabels,
} from '@/lib/chatwoot/resolve-remaining-labels';

describe('resolveValueFromRemainingLabels', () => {
  it('returns the last funnel label still on the conversation', () => {
    expect(resolveValueFromRemainingLabels('funnel_status', ['arandi', 'ziyaret-etti'])).toBe(
      'ziyaret-etti',
    );
  });

  it('returns null when no funnel labels remain', () => {
    expect(resolveValueFromRemainingLabels('funnel_status', ['pre-sinav', 'whatsapp'])).toBeNull();
  });

  it('resolves student stage aliases to canonical CRM slugs', () => {
    expect(resolveValueFromRemainingLabels('student_stage', ['yerleşti', 'whatsapp'])).toBe(
      'yerlesti',
    );
  });

  it('resolves lead_source and is_organic from remaining paid labels', () => {
    expect(resolveValueFromRemainingLabels('lead_source', ['google-ads', 'meta-ads'])).toBe(
      'meta-ads',
    );
    expect(resolveValueFromRemainingLabels('is_organic', ['google-ads', 'google-maps'])).toBe(true);
  });
});

describe('resolveFieldAfterLabelRemoval', () => {
  it('falls back to yeni when no funnel labels remain', () => {
    expect(resolveFieldAfterLabelRemoval('funnel_status', ['pre-sinav'])).toBe('yeni');
  });

  it('uses another funnel label instead of defaulting to yeni', () => {
    expect(resolveFieldAfterLabelRemoval('funnel_status', ['arandi', 'pre-sinav'])).toBe('arandi');
  });

  it('falls back to unknown for student stage', () => {
    expect(resolveFieldAfterLabelRemoval('student_stage', ['yeni'])).toBe('unknown');
  });

  it('defaults deal_awaiting to false when label is gone', () => {
    expect(resolveFieldAfterLabelRemoval('deal_awaiting', [])).toBe(false);
    expect(defaultLabelFieldValue('deal_awaiting')).toBe(false);
  });
});

describe('resolveDormAwaitingFromRemainingLabels', () => {
  it('keeps all dorm labels still present', () => {
    expect(
      resolveDormAwaitingFromRemainingLabels([
        'kyk-sonuc-bekliyor',
        'ibb-yurdu-sonuc-bekliyor',
        'whatsapp',
      ]),
    ).toEqual(['kyk-sonuc-bekliyor', 'ibb-yurdu-sonuc-bekliyor']);
  });
});
