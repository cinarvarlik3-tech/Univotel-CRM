/**
 * Detay tab — all remaining lead fields not in Genel or Profil.
 * Grouped into collapsible sub-sections; hotel recommendation stays flat.
 */
import { useState, type ReactNode } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import {
  InlineEditField,
  ReadOnlyField,
  type SelectOption,
} from '@/components/leads/InlineEditField';
import { LeadRecommendationPanel } from '@/components/leads/LeadRecommendationPanel';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime, formatYesNo } from '@/lib/i18n/format-date';
import { localeToBcp47 } from '@/lib/i18n/types';
import { FUNNEL_STATUSES, LOSS_REASONS, ROOM_CATEGORY_VALUES } from '@/lib/constants';
import type { LeadDetailRow, LeadWithDetails } from '@/types/domain';

interface DetayTabProps {
  lead: LeadWithDetails;
  leadId: string;
  details: LeadDetailRow | null;
  onLeadSaved: (data: Partial<LeadWithDetails>) => void;
  onDetailsSaved: (data: LeadDetailRow) => void;
  onReload: () => void;
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
        className="flex w-full items-center gap-1.5 py-2.5 text-left"
      >
        {open ? (
          <IconChevronDown className="size-3.5 shrink-0 text-text-tertiary" />
        ) : (
          <IconChevronRight className="size-3.5 shrink-0 text-text-tertiary" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </span>
      </button>
      {open && <div className="space-y-2 pb-3">{children}</div>}
    </div>
  );
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

export function DetayTab({
  lead,
  leadId,
  details,
  onLeadSaved,
  onDetailsSaved,
  onReload,
}: DetayTabProps) {
  const { locale, t } = useTranslation();
  const assignee = lead.salespeople?.full_name ?? lead.assignee_name ?? t('common.unassigned');

  const funnelOptions: SelectOption[] = FUNNEL_STATUSES.map((s) => ({
    value: s,
    label: formatEnumLabel(locale, 'funnel', s),
  }));

  const lossOptions: SelectOption[] = LOSS_REASONS.map((r) => ({
    value: r,
    label: formatEnumLabel(locale, 'loss', r),
  }));

  const roomCatOptions: SelectOption[] = ROOM_CATEGORY_VALUES.map((r) => ({
    value: r,
    label: formatEnumLabel(locale, 'room', r),
  }));

  return (
    <div>
      {/* ── Durum ──────────────────────────────────────────── */}
      <CollapsibleSection title={t('leads.status')}>
        <InlineEditField
          label={t('leads.funnelStatus')}
          type="select"
          value={lead.funnel_status}
          options={funnelOptions}
          onSave={async (v) => {
            onLeadSaved(await patchLead(leadId, { funnel_status: v as string }));
          }}
        />
        <InlineEditField
          label={t('filters.lossReason')}
          type="select"
          value={lead.loss_reason ?? ''}
          options={lossOptions}
          nullable
          onSave={async (v) => {
            onLeadSaved(await patchLead(leadId, { loss_reason: v || null }));
          }}
        />
        <ReadOnlyField
          label={t('leads.slaDeadline')}
          value={formatDateTime(lead.sla_deadline, locale)}
        />
        <ReadOnlyField label={t('leads.created')} value={formatDateTime(lead.created_at, locale)} />
        <ReadOnlyField label={t('leads.assignee')} value={assignee} />
        <ReadOnlyField
          label={t('filters.channel')}
          value={lead.message_from ? formatEnumLabel(locale, 'channel', lead.message_from) : null}
        />
        <ReadOnlyField label={t('filters.organic')} value={formatYesNo(lead.is_organic, locale)} />
      </CollapsibleSection>

      {/* ── Öğrenci Profili ─────────────────────────────────── */}
      <CollapsibleSection title={t('filters.sectionStudentProfile')}>
        <InlineEditField
          label={t('filters.nationality')}
          type="text"
          value={details?.nationality}
          nullable
          onSave={async (v) => {
            onDetailsSaved(await patchDetails(leadId, { nationality: v }));
          }}
        />
        <InlineEditField
          label={t('filters.preferredDistrict')}
          type="text"
          value={details?.preferred_district}
          nullable
          onSave={async (v) => {
            onDetailsSaved(await patchDetails(leadId, { preferred_district: v }));
          }}
        />
        <InlineEditField
          label={t('leads.moveIn')}
          type="text"
          value={
            details?.move_in
              ? new Date(details.move_in).toLocaleDateString(localeToBcp47(locale))
              : null
          }
          nullable
          onSave={async (v) => {
            onDetailsSaved(await patchDetails(leadId, { move_in: v || null }));
          }}
        />
        <ReadOnlyField
          label={t('leads.hotels')}
          value={details?.interested_hotel?.length ? details.interested_hotel.join(', ') : null}
        />
      </CollapsibleSection>

      {/* ── Öneri Girdileri ─────────────────────────────────── */}
      <CollapsibleSection title={t('leads.recInputs')}>
        <InlineEditField
          label={t('leads.recCampus')}
          type="text"
          value={details?.campus}
          nullable
          onSave={async (v) => {
            onDetailsSaved(await patchDetails(leadId, { campus: v }));
          }}
        />
        <InlineEditField
          label={t('leads.recRoomType')}
          type="select"
          value={details?.room_category ?? ''}
          options={roomCatOptions}
          nullable
          onSave={async (v) => {
            onDetailsSaved(await patchDetails(leadId, { room_category: v || null }));
          }}
        />
        <InlineEditField
          label={t('leads.recDistrictPref')}
          type="text"
          value={details?.district_preference}
          nullable
          onSave={async (v) => {
            onDetailsSaved(await patchDetails(leadId, { district_preference: v }));
          }}
        />
      </CollapsibleSection>

      {/* ── Otel Önerisi (flat, no toggle) ──────────────────── */}
      <div className="border-b border-border-default py-2.5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {t('leads.hotelRecommendation')}
        </p>
        <LeadRecommendationPanel leadId={leadId} details={details} onRecLoaded={onReload} />
      </div>

      {/* ── Kaynak Detayları ─────────────────────────────────── */}
      <CollapsibleSection title={t('leads.sourceAttribution')}>
        <SourceDetailsPanel sourceDetails={lead.source_details} embedded />
      </CollapsibleSection>
    </div>
  );
}
