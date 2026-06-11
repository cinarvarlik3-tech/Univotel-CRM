import { describe, expect, it } from 'vitest';
import { resolveTemplateVariables } from '@/lib/campaigns/resolve-template-variables';

describe('resolveTemplateVariables', () => {
  const lead = {
    lead_name: 'Ali',
    lead_phone: '05320000000',
    language: 'tr',
    funnel_status: 'yeni',
  };

  it('resolves ordered parameters', () => {
    const result = resolveTemplateVariables({ '1': 'lead_name', '2': 'funnel_status' }, lead, null);
    expect(result).toEqual({ ok: true, parameters: ['Ali', 'yeni'] });
  });

  it('uses first interested_hotel as hotel name', () => {
    const result = resolveTemplateVariables({ '1': 'interested_hotel.hotel_name' }, lead, {
      university: null,
      budget_tier: null,
      budget_max: null,
      interested_hotel: ['Kampüs Han'],
    });
    expect(result).toEqual({ ok: true, parameters: ['Kampüs Han'] });
  });

  it('returns missing_variable when field empty', () => {
    const result = resolveTemplateVariables(
      { '1': 'lead_name' },
      { ...lead, lead_name: null },
      null,
    );
    expect(result).toEqual({ ok: false, reason: 'missing_variable', field: 'lead_name' });
  });
});
