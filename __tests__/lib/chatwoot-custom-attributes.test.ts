/**
 * Unit tests for Chatwoot custom-attribute parsing, mapping, and lost-transition logic.
 */
import { describe, expect, it } from 'vitest';
import {
  extractCustomAttributeDiff,
  isOdaTipiDorm,
  isOdaTipiLiteralLabel,
  mapButce,
  mapKayipNedeni,
  mapOdaTipiFromCrm,
  mapOdaTipiInbound,
  mapOdaTipiToRoomCategory,
  mapOgrenciCinsiyet,
  normalizeCustomAttrKey,
  parseMoveInDate,
  resolveLostTransition,
} from '@/lib/chatwoot/custom-attributes';
import { buildCustomAttributesFromCrm } from '@/lib/chatwoot/sync-custom-attributes';

describe('extractCustomAttributeDiff', () => {
  it('diffs current_value vs previous_value of the custom_attributes entry', () => {
    const diff = extractCustomAttributeDiff([
      { custom_attributes: { current_value: { university: 'Boğaziçi' }, previous_value: {} } },
    ]);
    expect(diff).toEqual({ university: { current: 'Boğaziçi', previous: undefined } });
  });

  it('normalizes legacy ogrenci_cinsiyeti key to ogrenci_cinsiyet', () => {
    const diff = extractCustomAttributeDiff([
      {
        custom_attributes: {
          current_value: { ogrenci_cinsiyeti: 'Kız' },
          previous_value: {},
        },
      },
    ]);
    expect(diff).toEqual({ ogrenci_cinsiyet: { current: 'Kız', previous: undefined } });
  });

  it('omits keys that did not change', () => {
    const diff = extractCustomAttributeDiff([
      {
        custom_attributes: {
          current_value: { university: 'X', butce: 'Ortalama' },
          previous_value: { university: 'X' },
        },
      },
    ]);
    expect(diff).toEqual({ butce: { current: 'Ortalama', previous: undefined } });
  });

  it('returns null when there is no custom_attributes change entry', () => {
    expect(
      extractCustomAttributeDiff([{ label_list: { current_value: [], previous_value: [] } }]),
    ).toBeNull();
  });

  it('returns null when nothing actually changed', () => {
    expect(
      extractCustomAttributeDiff([
        {
          custom_attributes: {
            current_value: { university: 'X' },
            previous_value: { university: 'X' },
          },
        },
      ]),
    ).toBeNull();
  });
});

describe('normalizeCustomAttrKey', () => {
  it('maps legacy gender key', () => {
    expect(normalizeCustomAttrKey('ogrenci_cinsiyeti')).toBe('ogrenci_cinsiyet');
    expect(normalizeCustomAttrKey('university')).toBe('university');
  });
});

describe('mapButce', () => {
  it('maps Chatwoot list labels to tier slugs (case-insensitive)', () => {
    expect(mapButce('Düşük bütçe')).toBe('dusuk-butce');
    expect(mapButce('Ortalama')).toBe('ortalama');
    expect(mapButce('Yüksek bütçe')).toBe('yuksek-butce');
    expect(mapButce('Çok yüksek bütçe')).toBe('cok-yuksek-butce');
    expect(mapButce('Anlaşılmıyor')).toBe('anlasilmiyor');
  });

  it('returns null for empty or unknown values', () => {
    expect(mapButce('---')).toBeNull();
    expect(mapButce('')).toBeNull();
    expect(mapButce(null)).toBeNull();
  });
});

describe('parseMoveInDate', () => {
  it('converts an Istanbul-midnight UTC timestamp to the local date', () => {
    expect(parseMoveInDate('2026-12-02T21:00:00.000Z')).toBe('2026-12-03');
    expect(parseMoveInDate('2026-08-31T21:00:00.000Z')).toBe('2026-09-01');
  });

  it('returns null for empty or unparseable input', () => {
    expect(parseMoveInDate('')).toBeNull();
    expect(parseMoveInDate('not a date')).toBeNull();
    expect(parseMoveInDate(undefined)).toBeNull();
  });
});

describe('mapKayipNedeni', () => {
  it('maps known fixed-list values (case-insensitive)', () => {
    expect(mapKayipNedeni('fiyat')).toBe('price');
    expect(mapKayipNedeni('Bölge')).toBe('location');
    expect(mapKayipNedeni('Rakip')).toBe('competitor');
    expect(mapKayipNedeni('yanıt yok')).toBe('no_response');
    expect(mapKayipNedeni('planlar değişti')).toBe('plans_changed');
  });

  it('maps unknown non-empty values to other, and empty to null', () => {
    expect(mapKayipNedeni('something else')).toBe('other');
    expect(mapKayipNedeni('')).toBeNull();
    expect(mapKayipNedeni(undefined)).toBeNull();
  });
});

describe('mapOgrenciCinsiyet', () => {
  it('maps fixed-list values (case-insensitive)', () => {
    expect(mapOgrenciCinsiyet('Erkek')).toBe('male');
    expect(mapOgrenciCinsiyet('Kız')).toBe('female');
    expect(mapOgrenciCinsiyet('Bilinmiyor')).toBe('other');
  });

  it('returns null for empty or unknown values', () => {
    expect(mapOgrenciCinsiyet('')).toBeNull();
    expect(mapOgrenciCinsiyet(undefined)).toBeNull();
    expect(mapOgrenciCinsiyet('something else')).toBeNull();
  });
});

describe('mapOdaTipiToRoomCategory / isOdaTipiDorm / mapOdaTipiInbound', () => {
  it('maps standard occupancy labels to room_category', () => {
    expect(mapOdaTipiToRoomCategory('Tek Kişilik')).toBe('single');
    expect(mapOdaTipiToRoomCategory('Çift Kişilik')).toBe('double');
    expect(mapOdaTipiToRoomCategory('Üç Kişilik')).toBe('triple');
    expect(mapOdaTipiToRoomCategory('Dört Kişilik')).toBe('quad');
    expect(mapOdaTipiToRoomCategory('Fark Etmez')).toBeNull();
    expect(mapOdaTipiToRoomCategory('Yurt Tipi')).toBeNull();
    expect(mapOdaTipiToRoomCategory('')).toBeNull();
  });

  it('detects the dormitory option', () => {
    expect(isOdaTipiDorm('Yurt Tipi')).toBe(true);
    expect(isOdaTipiDorm('yurt tipi')).toBe(true);
    expect(isOdaTipiDorm('Tek Kişilik')).toBe(false);
  });

  it('maps literal and dorm inbound values', () => {
    expect(mapOdaTipiInbound('1+1', [])).toEqual({ room_category: null, room_type: ['1+1'] });
    expect(mapOdaTipiInbound('Fark Etmez', ['Yurt Tipi'])).toEqual({
      room_category: null,
      room_type: [],
    });
    expect(mapOdaTipiInbound('Yurt Tipi', [])).toEqual({
      room_category: null,
      room_type: ['Yurt Tipi'],
    });
    expect(mapOdaTipiInbound('Dört Kişilik', ['1+1'])).toEqual({
      room_category: 'quad',
      room_type: [],
    });
  });

  it('detects literal room type labels', () => {
    expect(isOdaTipiLiteralLabel('2+1')).toBe(true);
    expect(isOdaTipiLiteralLabel('single')).toBe(false);
  });
});

describe('mapOdaTipiFromCrm / buildCustomAttributesFromCrm', () => {
  it('prefers room_category for outbound oda_tiipi', () => {
    expect(mapOdaTipiFromCrm('double', [])).toBe('Çift Kişilik');
  });

  it('builds outbound custom attributes from CRM state', () => {
    const attrs = buildCustomAttributesFromCrm({
      loss_reason: 'price',
      university: 'Boğaziçi Üniversitesi',
      budget_tier: 'yuksek-butce',
      move_in: '2026-09-01',
      room_category: 'double',
      room_type: [],
      student_gender: 'female',
      interested_hotel: ['Otel A'],
    });
    expect(attrs.butce).toBe('Yüksek bütçe');
    expect(attrs.ogrenci_cinsiyet).toBe('Kız');
    expect(attrs.kayip_nedeni).toBe('fiyat');
    expect(attrs.oda_tiipi).toBe('Çift Kişilik');
    expect(attrs.ilgili_otel).toBe('Otel A');
  });
});

describe('resolveLostTransition', () => {
  const base = { prevFunnel: 'ziyaret-etti', beforeLost: null, added: [], removed: [] };

  it('enters lost and saves the prior stage when a loss reason is set', () => {
    expect(resolveLostTransition({ ...base, lossIntent: 'set' })).toEqual({
      funnelStatus: 'lost',
      funnelStatusBeforeLost: 'ziyaret-etti',
    });
  });

  it('enters lost when the lost label is added', () => {
    expect(resolveLostTransition({ ...base, added: ['lost'], lossIntent: undefined })).toEqual({
      funnelStatus: 'lost',
      funnelStatusBeforeLost: 'ziyaret-etti',
    });
  });

  it('does not overwrite the saved stage when already lost', () => {
    expect(
      resolveLostTransition({
        prevFunnel: 'lost',
        beforeLost: 'ziyaret-etti',
        added: [],
        removed: [],
        lossIntent: 'set',
      }),
    ).toEqual({ funnelStatus: 'lost', funnelStatusBeforeLost: undefined });
  });

  it('restores the prior stage when the loss reason is cleared', () => {
    expect(
      resolveLostTransition({
        prevFunnel: 'lost',
        beforeLost: 'ziyaret-etti',
        added: [],
        removed: [],
        lossIntent: 'clear',
      }),
    ).toEqual({
      funnelStatus: 'ziyaret-etti',
      funnelStatusBeforeLost: null,
      clearLossReason: true,
    });
  });

  it('restores to the default stage when no prior stage was saved', () => {
    expect(
      resolveLostTransition({
        prevFunnel: 'lost',
        beforeLost: null,
        added: [],
        removed: ['lost'],
        lossIntent: undefined,
      }),
    ).toEqual({ funnelStatus: 'yeni', funnelStatusBeforeLost: null, clearLossReason: true });
  });

  it('does not restore when the lead was already moved off lost (untouched rule)', () => {
    expect(
      resolveLostTransition({
        prevFunnel: 'arandi',
        beforeLost: null,
        added: [],
        removed: [],
        lossIntent: 'clear',
      }),
    ).toEqual({});
  });

  it('honors an explicit funnel label over the saved stage when leaving lost', () => {
    expect(
      resolveLostTransition({
        prevFunnel: 'lost',
        beforeLost: 'ziyaret-etti',
        added: ['arandi'],
        removed: [],
        lossIntent: undefined,
      }),
    ).toEqual({ funnelStatus: 'arandi', funnelStatusBeforeLost: null, clearLossReason: true });
  });
});
