/**
 * Genel tab — primary editable fields for the lead detail panel.
 * Each field is an individually editable box card.
 */
import { InlineEditField, type SelectOption } from '@/components/leads/InlineEditField';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import {
  DORM_AWAITING_VALUES,
  FUNNEL_STATUSES,
  PERSONA_TYPES,
  SPECIAL_STATES,
  STUDENT_GENDER_VALUES,
  STUDENT_STAGES,
} from '@/lib/constants';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface GenelTabProps {
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

export function GenelTab({ lead, leadId, details, onLeadSaved, onDetailsSaved }: GenelTabProps) {
  const { locale, t } = useTranslation();

  const personaOptions: SelectOption[] = PERSONA_TYPES.map((p) => ({
    value: p,
    label: formatEnumLabel(locale, 'persona', p),
  }));

  const genderOptions: SelectOption[] = STUDENT_GENDER_VALUES.map((g) => ({
    value: g,
    label: formatEnumLabel(locale, 'gender', g),
  }));

  const stageOptions: SelectOption[] = STUDENT_STAGES.map((s) => ({
    value: s,
    label: formatEnumLabel(locale, 'stage', s),
  }));

  const specialOptions: SelectOption[] = SPECIAL_STATES.map((s) => ({
    value: s,
    label: formatEnumLabel(locale, 'special', s),
  }));

  const dormOptions: SelectOption[] = DORM_AWAITING_VALUES.map((d) => ({
    value: d,
    label: formatEnumLabel(locale, 'dorm', d),
  }));

  const funnelOptions: SelectOption[] = FUNNEL_STATUSES.map((s) => ({
    value: s,
    label: formatEnumLabel(locale, 'funnel', s),
  }));

  const persona = lead.persona_type;
  const phoneLabel =
    persona === 'veli'
      ? t('leads.ogrenciTelefonu')
      : persona === 'ogrenci'
        ? t('leads.veliTelefonu')
        : t('leads.veliOgrenciTelefonu');

  const nameLabel =
    persona === 'veli'
      ? t('leads.ogrenciIsmi')
      : persona === 'ogrenci'
        ? t('leads.veliIsmi')
        : t('leads.veliOgrenciIsmi');

  return (
    <div className="space-y-2">
      {/* 0. Funnel Status */}
      <InlineEditField
        label={t('leads.funnelStatus')}
        type="select"
        value={lead.funnel_status}
        options={funnelOptions}
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { funnel_status: v as string }));
        }}
      />

      {/* 1. Persona */}
      <InlineEditField
        label={t('leads.persona')}
        type="select"
        value={lead.persona_type ?? ''}
        options={personaOptions}
        nullable
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { persona_type: v || null }));
        }}
      />

      {/* 2. Öğrenci cinsiyeti */}
      <InlineEditField
        label={t('leads.cinsiyet')}
        type="select"
        value={details?.student_gender ?? ''}
        options={genderOptions}
        nullable
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { student_gender: v || null }));
        }}
      />

      {/* 3. Responsive phone */}
      <InlineEditField
        label={phoneLabel}
        type="text"
        value={lead.parent_phone}
        nullable
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { parent_phone: v }));
        }}
      />

      {/* 3.1 Responsive name */}
      <InlineEditField
        label={nameLabel}
        type="text"
        value={details?.parent_name}
        nullable
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { parent_name: v }));
        }}
      />

      {/* 4. Student Stage */}
      <InlineEditField
        label={t('leads.studentStage')}
        type="select"
        value={lead.student_stage}
        options={stageOptions}
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { student_stage: v as string }));
        }}
      />

      {/* 5. Özel Durum */}
      <InlineEditField
        label={t('leads.specialState')}
        type="select"
        value={lead.special_state ?? ''}
        options={specialOptions}
        nullable
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { special_state: v || null }));
        }}
      />

      {/* 6. Dorm Stage */}
      <InlineEditField
        label={t('leads.dormStage')}
        type="multiselect"
        value={details?.dorm_awaiting ?? []}
        options={dormOptions}
        onSave={async (v) => {
          onDetailsSaved(await patchDetails(leadId, { dorm_awaiting: v as string[] }));
        }}
      />

      {/* 7. Deal Awaiting */}
      <InlineEditField
        label={t('leads.dealAwaiting')}
        type="select"
        value={lead.deal_awaiting ? 'true' : 'false'}
        options={[
          { value: 'false', label: t('common.no') },
          { value: 'true', label: t('common.yes') },
        ]}
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { deal_awaiting: v === 'true' }));
        }}
      />

      {/* 8. Notes */}
      <InlineEditField
        label={t('leads.notes')}
        type="textarea"
        value={lead.notes}
        nullable
        className="min-h-[100px]"
        onSave={async (v) => {
          onLeadSaved(await patchLead(leadId, { notes: v }));
        }}
      />
    </div>
  );
}
