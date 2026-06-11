/**
 * Profil tab — student profile fields for the lead detail panel.
 * Each field is an individually editable box card.
 */
import {
  InlineEditField,
  ReadOnlyField,
  type SelectOption,
} from '@/components/leads/InlineEditField';
import { InlineUniversityField } from '@/components/leads/InlineUniversityField';
import { useDebouncedSchoolShortnameSync } from '@/hooks/useDebouncedSchoolShortnameSync';
import { useTranslation } from '@/hooks/useTranslation';
import { useUniversities } from '@/hooks/useUniversities';
import { lookupSchoolShortname } from '@/lib/leads/lookup-school-shortname';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { BUDGET_TIERS, LANGUAGES, UNI_YEARS } from '@/lib/constants';
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
  const { data: universities = [], isLoading: universitiesLoading } = useUniversities();

  const uniYearOptions: SelectOption[] = UNI_YEARS.map((y) => ({
    value: y,
    label: formatEnumLabel(locale, 'uniYear', y),
  }));

  const langOptions: SelectOption[] = LANGUAGES.map((l) => ({
    value: l,
    label: formatEnumLabel(locale, 'language', l),
  }));

  const budgetTierOptions: SelectOption[] = BUDGET_TIERS.map((tier) => ({
    value: tier,
    label: formatEnumLabel(locale, 'budgetTier', tier),
  }));

  const persona = lead.persona_type;
  const nameLabel =
    persona === 'veli'
      ? t('leads.ogrenciIsmi')
      : persona === 'ogrenci'
        ? t('leads.veliIsmi')
        : t('leads.veliOgrenciIsmi');

  const schoolShortnameDisplay =
    lookupSchoolShortname(details?.university, universities) ?? details?.school_shortname ?? null;

  useDebouncedSchoolShortnameSync({
    leadId,
    university: details?.university,
    schoolShortname: details?.school_shortname,
    universities,
    onDetailsSaved,
  });

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

      {/* 2. University — searchable dropdown from universities table */}
      <InlineUniversityField
        label={t('leads.universityName')}
        value={details?.university}
        universities={universities}
        loading={universitiesLoading}
        onSave={async (university) => {
          onDetailsSaved(await patchDetails(leadId, { university }));
        }}
      />

      {/* 2b. School shortname — auto-synced 2s after university changes */}
      <ReadOnlyField label={t('leads.schoolShortname')} value={schoolShortnameDisplay} />

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

      {/* 4. Budget tier */}
      <InlineEditField
        label={t('filters.budgetTier')}
        type="select"
        value={details?.budget_tier ?? ''}
        options={budgetTierOptions}
        nullable
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { budget_tier: v || null }));
        }}
      />

      {/* 5. Language */}
      <InlineEditField
        label={t('filters.language')}
        type="select"
        value={lead.language}
        options={langOptions}
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { language: v as string }));
        }}
      />

      {/* 6. Room preference */}
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

      {/* 7. İlgilenilen otel — synced from Chatwoot ilgili_otel */}
      <ReadOnlyField
        label={t('filters.interestedHotel')}
        value={details?.interested_hotel?.length ? details.interested_hotel.join(', ') : null}
      />
    </div>
  );
}
