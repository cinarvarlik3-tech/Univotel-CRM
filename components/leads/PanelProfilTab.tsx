/**
 * Merged Profil tab for the slide-over (§3.3 / D7, D9).
 * Field saves apply optimistically; failures surface via panel toast after 3s.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { InlineEditField, type SelectOption } from '@/components/leads/InlineEditField';
import { InlineUniversityField } from '@/components/leads/InlineUniversityField';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { useDebouncedSchoolShortnameSync } from '@/hooks/useDebouncedSchoolShortnameSync';
import { useProperties } from '@/hooks/useProperties';
import { useTranslation } from '@/hooks/useTranslation';
import { useUniversities } from '@/hooks/useUniversities';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime } from '@/lib/i18n/format-date';
import {
  BUDGET_TIERS,
  LOSS_REASONS,
  PERSONA_TYPES,
  ROOM_CATEGORY_VALUES,
  SPECIAL_STATES,
  STUDENT_GENDER_VALUES,
  UNI_YEARS,
} from '@/lib/constants';
import { PanelSaveError, runOptimisticSave } from '@/lib/ui/optimistic-panel-save';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface PanelProfilTabProps {
  lead: LeadWithDetails;
  leadId: string;
  details: LeadDetailRow | null;
  onLeadSaved: (data: Partial<LeadWithDetails>) => void;
  onDetailsSaved: (data: LeadDetailRow) => void;
  onSaveFailed: (message: string) => void;
  /** D21: called when a field starts or stops being edited (dirty state tracking). */
  onDirtyChange?: (dirty: boolean) => void;
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
  if (!res.ok) throw new PanelSaveError(json.error ?? 'Güncelleme başarısız', res.status);
  return json.data as Partial<LeadWithDetails>;
}

async function patchDetails(leadId: string, body: Record<string, unknown>): Promise<LeadDetailRow> {
  const res = await fetch(`/api/lead-details/${leadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new PanelSaveError(json.error ?? 'Güncelleme başarısız', res.status);
  return json.data as LeadDetailRow;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-default last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 py-2 text-left"
      >
        {open ? (
          <IconChevronDown className="size-3.5 shrink-0 text-text-tertiary" />
        ) : (
          <IconChevronRight className="size-3.5 shrink-0 text-text-tertiary" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </span>
      </button>
      {open && <div className="space-y-2 pb-3">{children}</div>}
    </div>
  );
}

export function PanelProfilTab({
  lead,
  leadId,
  details,
  onLeadSaved,
  onDetailsSaved,
  onSaveFailed,
}: PanelProfilTabProps) {
  const { locale } = useTranslation();
  const { data: universities = [] } = useUniversities();
  const { data: properties = [] } = useProperties();

  useDebouncedSchoolShortnameSync({
    leadId,
    university: details?.university ?? null,
    schoolShortname: details?.school_shortname,
    universities,
    onDetailsSaved,
  });

  const saveLeadOptimistic = useCallback(
    (patch: Partial<LeadWithDetails>, persist: () => Promise<Partial<LeadWithDetails>>) => {
      const snapshot = { ...lead };
      void runOptimisticSave({
        applyOptimistic: () => onLeadSaved(patch),
        revert: () => onLeadSaved(snapshot),
        persist: async () => {
          const data = await persist();
          onLeadSaved(data);
          return data;
        },
        onFailure: onSaveFailed,
      });
      return Promise.resolve();
    },
    [lead, onLeadSaved, onSaveFailed],
  );

  const saveDetailsOptimistic = useCallback(
    (patch: Partial<LeadDetailRow>, persist: () => Promise<LeadDetailRow>) => {
      if (!details) return Promise.resolve();
      const snapshot = { ...details };
      void runOptimisticSave({
        applyOptimistic: () => onDetailsSaved({ ...details, ...patch }),
        revert: () => onDetailsSaved(snapshot),
        persist: async () => {
          const data = await persist();
          onDetailsSaved(data);
          return data;
        },
        onFailure: onSaveFailed,
      });
      return Promise.resolve();
    },
    [details, onDetailsSaved, onSaveFailed],
  );

  const personaOptions: SelectOption[] = PERSONA_TYPES.map((p) => ({
    value: p,
    label: formatEnumLabel(locale, 'persona', p),
  }));
  const genderOptions: SelectOption[] = STUDENT_GENDER_VALUES.map((g) => ({
    value: g,
    label: formatEnumLabel(locale, 'gender', g),
  }));
  const uniYearOptions: SelectOption[] = UNI_YEARS.map((y) => ({
    value: y,
    label: formatEnumLabel(locale, 'uniYear', y),
  }));
  const budgetOptions: SelectOption[] = BUDGET_TIERS.map((b) => ({
    value: b,
    label: formatEnumLabel(locale, 'budget', b),
  }));
  const roomOptions: SelectOption[] = ROOM_CATEGORY_VALUES.map((r) => ({
    value: r,
    label: formatEnumLabel(locale, 'roomCategory', r),
  }));
  const lossReasonOptions: SelectOption[] = LOSS_REASONS.map((r) => ({
    value: r,
    label: formatEnumLabel(locale, 'lossReason', r),
  }));
  const specialStateOptions: SelectOption[] = SPECIAL_STATES.map((s) => ({
    value: s,
    label: formatEnumLabel(locale, 'specialState', s),
  }));

  const hotelOptions: SelectOption[] = properties.map((p) => ({
    value: p.hotel_name,
    label: p.hotel_name,
  }));

  const interestedHotel = details?.interested_hotel?.[0] ?? '';

  const tier1Fields = [
    { label: 'Persona', value: lead.persona_type },
    { label: 'Cinsiyet', value: details?.student_gender },
    { label: 'Üniversite', value: details?.university },
    { label: 'Üniversite yılı', value: details?.uni_year },
    { label: 'İlgilenilen otel', value: interestedHotel },
    { label: 'Oda tercihi', value: details?.room_category },
    { label: 'Bütçe', value: details?.budget_tier },
    { label: 'Taşınma zamanı', value: details?.move_in },
  ];

  const missingTier1 = tier1Fields.filter((f) => !f.value);

  return (
    <div className="space-y-0">
      {/* ── Tier 1: Qualification card ─────────────────────────────────────── */}
      <div className="mb-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
          Nitelendirme
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <InlineEditField
            label="Persona"
            value={lead.persona_type ?? ''}
            type="select"
            options={personaOptions}
            onSave={(v) =>
              saveLeadOptimistic({ persona_type: (v as string) || null }, () =>
                patchLead(leadId, { persona_type: v || null }),
              )
            }
          />
          <InlineEditField
            label="Cinsiyet"
            value={details?.student_gender ?? ''}
            type="select"
            options={genderOptions}
            onSave={(v) =>
              saveDetailsOptimistic({ student_gender: (v as string) || null }, () =>
                patchDetails(leadId, { student_gender: v || null }),
              )
            }
          />
          <div className="col-span-2">
            <InlineUniversityField
              label="Üniversite"
              value={details?.university ?? null}
              universities={universities}
              uniYear={details?.uni_year ?? null}
              uniYearOptions={uniYearOptions}
              onSave={(v) => {
                const uni = universities.find((u) => u.uni_name === v);
                const updates: Record<string, unknown> = { university: v ?? null };
                if (uni?.city) updates.campus = uni.city;
                return saveDetailsOptimistic(updates as Partial<LeadDetailRow>, () =>
                  patchDetails(leadId, updates),
                );
              }}
              onSaveYear={(v) =>
                saveDetailsOptimistic({ uni_year: (v as string) || null }, () =>
                  patchDetails(leadId, { uni_year: v || null }),
                )
              }
            />
          </div>
          <InlineEditField
            label="İlgilenilen otel"
            value={interestedHotel}
            type="select"
            nullable
            options={hotelOptions}
            onSave={(v) => {
              const hotels = v ? [v as string] : [];
              return saveDetailsOptimistic({ interested_hotel: hotels }, () =>
                patchDetails(leadId, { interested_hotel: hotels }),
              );
            }}
          />
          <InlineEditField
            label="Oda tercihi"
            value={details?.room_category ?? ''}
            type="select"
            options={roomOptions}
            onSave={(v) =>
              saveDetailsOptimistic({ room_category: (v as string) || null }, () =>
                patchDetails(leadId, { room_category: v || null }),
              )
            }
          />
          <InlineEditField
            label="Bütçe"
            value={details?.budget_tier ?? ''}
            type="select"
            options={budgetOptions}
            onSave={(v) =>
              saveDetailsOptimistic({ budget_tier: (v as string) || null }, () =>
                patchDetails(leadId, { budget_tier: v || null }),
              )
            }
          />
          <InlineEditField
            label="Taşınma zamanı"
            value={details?.move_in ?? ''}
            type="text"
            onSave={(v) =>
              saveDetailsOptimistic({ move_in: (v as string) || null }, () =>
                patchDetails(leadId, { move_in: v || null }),
              )
            }
          />
          <div className="col-span-2">
            <InlineEditField
              label="Notlar"
              value={lead.notes ?? ''}
              type="textarea"
              onSave={(v) =>
                saveLeadOptimistic({ notes: (v as string) || null }, () =>
                  patchLead(leadId, { notes: v || null }),
                )
              }
            />
          </div>
        </div>

        {missingTier1.length > 0 && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="mb-1 text-[11px] font-semibold text-amber-700">
              Eksik bilgi ({missingTier1.length})
            </p>
            <p className="text-[11px] text-amber-600">
              {missingTier1.map((f) => f.label).join(' · ')}
            </p>
          </div>
        )}
      </div>

      <CollapsibleSection title="Kişi / İletişim">
        <InlineEditField
          label="Veli adı"
          value={details?.parent_name ?? ''}
          type="text"
          onSave={(v) =>
            saveDetailsOptimistic({ parent_name: (v as string) || null }, () =>
              patchDetails(leadId, { parent_name: v || null }),
            )
          }
        />
        <InlineEditField
          label="Veli telefonu"
          value={lead.parent_phone ?? ''}
          type="text"
          onSave={(v) =>
            saveLeadOptimistic({ parent_phone: (v as string) || null }, () =>
              patchLead(leadId, { parent_phone: v || null }),
            )
          }
        />
      </CollapsibleSection>

      <CollapsibleSection title="Tercihler">
        <InlineEditField
          label="Dil"
          value={lead.language ?? ''}
          type="text"
          onSave={(v) =>
            saveLeadOptimistic({ language: (v as string) || undefined }, () =>
              patchLead(leadId, { language: v || null }),
            )
          }
        />
        <InlineEditField
          label="İlçe tercihi"
          value={details?.preferred_district ?? ''}
          type="text"
          onSave={(v) =>
            saveDetailsOptimistic({ preferred_district: (v as string) || null }, () =>
              patchDetails(leadId, { preferred_district: v || null }),
            )
          }
        />
      </CollapsibleSection>

      <CollapsibleSection title="Durum">
        <InlineEditField
          label="Özel durum"
          value={lead.special_state ?? ''}
          type="select"
          options={specialStateOptions}
          onSave={(v) =>
            saveLeadOptimistic({ special_state: (v as string) || null }, () =>
              patchLead(leadId, { special_state: v || null }),
            )
          }
        />
        <InlineEditField
          label="Kayıp nedeni"
          value={lead.loss_reason ?? ''}
          type="select"
          options={lossReasonOptions}
          onSave={(v) =>
            saveLeadOptimistic({ loss_reason: (v as string) || null }, () =>
              patchLead(leadId, { loss_reason: v || null }),
            )
          }
        />
      </CollapsibleSection>

      <CollapsibleSection title="Sistem / Kaynak">
        <div className="space-y-1 text-xs text-text-secondary">
          <div>
            <span className="font-medium">Oluşturulma: </span>
            {formatDateTime(lead.created_at, locale)}
          </div>
          <div>
            <span className="font-medium">Kaynak: </span>
            {formatEnumLabel(locale, 'source', lead.lead_source)}
          </div>
          {lead.source_details && (
            <details>
              <summary className="cursor-pointer text-[11px] text-text-tertiary">
                Kaynak detayları
              </summary>
              <div className="mt-1">
                <SourceDetailsPanel sourceDetails={lead.source_details} />
              </div>
            </details>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
