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
import { LossRecoveryFinanceDialog } from '@/components/leads/LossRecoveryFinanceDialog';
import { SourceDetailsPanel } from '@/components/leads/SourceDetailsPanel';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { formatDateTime, formatYesNo } from '@/lib/i18n/format-date';
import { FUNNEL_STATUSES, LOSS_REASONS, ROOM_CATEGORY_VALUES } from '@/lib/constants';
import { getLossRecoveryFinancialTarget } from '@/lib/leads/apply-loss-reason-update';
import type { FinancialFunnelStatus } from '@/lib/leads/apply-loss-reason-update';
import { parseRecHotel } from '@/lib/leads/parse-rec-hotel';
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
  const [lossRecoveryOpen, setLossRecoveryOpen] = useState(false);
  const [lossRecoveryTarget, setLossRecoveryTarget] = useState<FinancialFunnelStatus | null>(null);
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

  const recHotelDisplay = (() => {
    const items = parseRecHotel(details?.rec_hotel);
    return items?.length ? items.map((r) => r.hotel_name).join(', ') : null;
  })();

  return (
    <div>
      {/* ── Öncül (always visible) ─────────────────────────── */}
      <div className="border-b border-border-default pb-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {t('leads.sectionOncul')}
        </p>
        <div className="space-y-2">
          <InlineEditField
            label={t('filters.lossReason')}
            type="select"
            value={lead.loss_reason ?? ''}
            options={lossOptions}
            nullable
            onSave={async (v) => {
              const nextLoss = (v as string) || null;
              const recoveryTarget = getLossRecoveryFinancialTarget(
                {
                  funnel_status: lead.funnel_status,
                  funnel_status_before_lost: lead.funnel_status_before_lost,
                  loss_reason: lead.loss_reason,
                },
                { loss_reason: nextLoss },
              );
              if (recoveryTarget) {
                setLossRecoveryTarget(recoveryTarget);
                setLossRecoveryOpen(true);
                return;
              }
              onLeadSaved(await patchLead(leadId, { loss_reason: nextLoss }));
            }}
          />
          <ReadOnlyField
            label={t('leads.created')}
            value={formatDateTime(lead.created_at, locale)}
          />
          <ReadOnlyField label={t('leads.assignee')} value={assignee} />
          <ReadOnlyField
            label={t('filters.channel')}
            value={lead.message_from ? formatEnumLabel(locale, 'channel', lead.message_from) : null}
          />
          <InlineEditField
            label={t('leads.moveIn')}
            type="date"
            value={details?.move_in ?? null}
            nullable
            onSave={async (v) => {
              onDetailsSaved(await patchDetails(leadId, { move_in: v || null }));
              onReload();
            }}
          />
          {lead.funnel_status === 'sozlesme-imzalandi' && (
            <InlineEditField
              label={t('leads.actualMoveInDate')}
              type="date"
              value={details?.actual_move_in_date ?? null}
              nullable
              onSave={async (v) => {
                onDetailsSaved(await patchDetails(leadId, { actual_move_in_date: v || null }));
                onReload();
              }}
            />
          )}
        </div>
      </div>

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
        <ReadOnlyField
          label={t('leads.slaDeadline')}
          value={formatDateTime(lead.sla_deadline, locale)}
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
        <ReadOnlyField label={t('leads.recommendedHotel')} value={recHotelDisplay} />
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

      {lossRecoveryTarget && (
        <LossRecoveryFinanceDialog
          open={lossRecoveryOpen}
          onOpenChange={setLossRecoveryOpen}
          leadId={leadId}
          targetStatus={lossRecoveryTarget}
          initialPropertyId={details?.purchased_property_id}
          initialRoomTypeId={details?.purchased_room}
          onSuccess={(data) => {
            if (data) onLeadSaved(data as Partial<LeadWithDetails>);
            onReload();
            setLossRecoveryTarget(null);
          }}
        />
      )}
    </div>
  );
}
