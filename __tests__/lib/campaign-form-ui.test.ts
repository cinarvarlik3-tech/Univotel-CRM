/**
 * Unit tests for campaign form UI → API payload conversion.
 */
import { describe, expect, it } from 'vitest';
import {
  audienceStateToSegment,
  templateSlotsToVariables,
  validateTemplateSlots,
} from '@/lib/campaigns/campaign-form-ui';

describe('audienceStateToSegment', () => {
  it('converts dropdown filters to eq conditions', () => {
    const segment = audienceStateToSegment({
      filters: { funnel_status: 'yeni', lead_source: 'whatsapp' },
      createdFrom: '',
      createdTo: '',
      slaFrom: '',
      slaTo: '',
      scoreMin: '',
    });

    expect(segment.filters).toContainEqual({
      field: 'funnel_status',
      operator: 'eq',
      value: 'yeni',
    });
    expect(segment.filters).toContainEqual({
      field: 'lead_source',
      operator: 'eq',
      value: 'whatsapp',
    });
  });

  it('adds date and score filters', () => {
    const segment = audienceStateToSegment({
      filters: {},
      createdFrom: '2026-01-01',
      createdTo: '2026-01-31',
      slaFrom: '',
      slaTo: '',
      scoreMin: '50',
    });

    expect(segment.filters.some((f) => f.field === 'created_at' && f.operator === 'gte')).toBe(
      true,
    );
    expect(segment.filters.some((f) => f.field === 'lead_score' && f.value === '50')).toBe(true);
  });
});

describe('templateSlotsToVariables', () => {
  it('maps slot numbers to field names in order', () => {
    const vars = templateSlotsToVariables([
      { id: 'a', slot: 2, field: 'university' },
      { id: 'b', slot: 1, field: 'lead_name' },
    ]);

    expect(vars).toEqual({ '1': 'lead_name', '2': 'university' });
  });
});

describe('validateTemplateSlots', () => {
  it('rejects duplicate slot numbers', () => {
    const err = validateTemplateSlots([
      { id: 'a', slot: 1, field: 'lead_name' },
      { id: 'b', slot: 1, field: 'lead_phone' },
    ]);
    expect(err).toMatch(/unique/i);
  });
});
