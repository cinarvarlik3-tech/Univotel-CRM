/**
 * Profil tab — student profile fields for the lead detail panel.
 * Each field is an individually editable box card.
 */
import {
  InlineEditField,
  ReadOnlyField,
  type SelectOption,
} from '@/components/leads/InlineEditField';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { LANGUAGES, UNI_YEARS } from '@/lib/constants';
import { parseRecHotel } from '@/lib/leads/parse-rec-hotel';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface ProfilTabProps {
  lead: LeadWithDetails;
  leadId: string;
  details: LeadDetailRow | null;
  onLeadSaved: (data: Partial<LeadWithDetails>) => void;
  onDetailsSaved: (data: LeadDetailRow) => void;
}

async function patchLead(
  leadId: string,
  body: Record<string, unknown>,
): Promise<Partial<LeadWithDetails>> {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Güncelleme başarısız');
  return json.data as Partial<LeadWithDetails>;
}

async function patchDetails(leadId: string, body: Record<string, unknown>): Promise<LeadDetailRow> {
  const res = await fetch(`/api/lead-details/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Güncelleme başarısız');
  return json.data as LeadDetailRow;
}

export function ProfilTab({ lead, leadId, details, onLeadSaved, onDetailsSaved }: ProfilTabProps) {
  const { locale, t } = useTranslation();

  const uniYearOptions: SelectOption[] = UNI_YEARS.map((y) => ({
    value: y,
    label: formatEnumLabel(locale, 'uniYear', y),
  }));

  const langOptions: SelectOption[] = LANGUAGES.map((l) => ({
    value: l,
    label: formatEnumLabel(locale, 'language', l),
  }));

  const persona = lead.persona_type;
  const nameLabel =
    persona === 'veli'
      ? t('leads.ogrenciIsmi')
      : persona === 'ogrenci'
        ? t('leads.veliIsmi')
        : t('leads.veliOgrenciIsmi');

  const recommendations = parseRecHotel(details?.rec_hotel);
  const recHotelDisplay = recommendations?.length
    ? recommendations.map((r) => r.hotel_name).join(', ')
    : null;

  return (
    <div className="space-y-2">
      {/* 1. Veli/Öğrenci Adı */}
      <InlineEditField
        label={nameLabel}
        type="text"
        value={details?.parent_name}
        nullable
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { parent_name: v }));
        }}
      />

      {/* 2. University Name */}
      <InlineEditField
        label={t('leads.universityName')}
        type="text"
        value={details?.university}
        nullable
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { university: v }));
        }}
      />

      {/* 2b. School shortname */}
      <InlineEditField
        label={t('leads.schoolShortname')}
        type="text"
        value={details?.school_shortname}
        nullable
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { school_shortname: v }));
        }}
      />

      {/* 3. School year */}
      <InlineEditField
        label={t('leads.schoolYear')}
        type="select"
        value={details?.uni_year ?? ''}
        options={uniYearOptions}
        nullable
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { uni_year: v || null }));
        }}
      />

      {/* 4. Language */}
      <InlineEditField
        label={t('filters.language')}
        type="select"
        value={lead.language}
        options={langOptions}
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { language: v as string }));
        }}
      />

      {/* 5. Room preference */}
      <InlineEditField
        label={t('leads.roomPreference')}
        type="text"
        value={details?.room_type?.join(', ') ?? null}
        nullable
        onSave={async (v) => {
          const arr =
            typeof v === 'string' && v.trim()
              ? v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
          onDetailsSaved(await patchDetails(leadId, { room_type: arr }));
        }}
      />

      {/* 6. Recommended hotel — read-only */}
      <ReadOnlyField label={t('leads.recommendedHotel')} value={recHotelDisplay} />
    </div>
  );
}
