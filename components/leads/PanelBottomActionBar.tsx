/**
 * Bottom sticky action bar for the lead detail slide-over (§3.4 / D8).
 * Primary: D5 stage-action for this stage.
 * Secondary: stage picker, guarded destructive actions.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { FUNNEL_STATUSES } from '@/lib/constants';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { cn } from '@/lib/utils';
import type { LeadWithDetails } from '@/types/domain';

/** D5 primary next-action label per stage. */
function primaryActionLabel(funnel_status: string): string {
  switch (funnel_status) {
    case 'yeni':
      return 'Talep Et / Ara';
    case 'aranacak':
    case 'arandi-acmadi':
      return 'Çağrı sonucu kaydet';
    case 'arandi':
    case 'bilgi-verildi':
    case 'bizi-aradi-konustuk':
      return 'İletişim kaydet';
    case 'ziyaret':
      return 'Ziyaret durumu';
    case 'ziyaret-etti':
    case 'teklif-gonderildi':
      return 'İletişim kaydet / İlerlet';
    case 'kapora-alindi':
      return 'Taşınma tarihi gir';
    case 'sozlesme-imzalandi':
      return 'Gerçek taşınma gir';
    default:
      return 'İlerlet';
  }
}

interface PanelBottomActionBarProps {
  lead: LeadWithDetails;
  leadId: string;
  isManager: boolean;
  onPrimaryAction: () => void;
  onReload: () => void;
  onClose: () => void;
}

/**
 * Bottom sticky action bar with stage-aware primary action,
 * one-click stage picker, and guarded destructive actions.
 */
export function PanelBottomActionBar({
  lead,
  leadId,
  isManager,
  onPrimaryAction,
  onReload,
  onClose,
}: PanelBottomActionBarProps) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const stagePickerRef = useRef<HTMLDivElement>(null);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [advanceSaving, setAdvanceSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isTerminal = lead.funnel_status === 'lost' || lead.funnel_status === 'sozlesme-imzalandi';
  const canManage = isManager || isManagerOrAbove(user?.role ?? '');

  const currentStageLabel = formatEnumLabel(locale, 'funnel', lead.funnel_status);

  const stageOptions = FUNNEL_STATUSES.filter((s) => s !== lead.funnel_status).map((s) => ({
    value: s,
    label: formatEnumLabel(locale, 'funnel', s),
  }));

  useEffect(() => {
    if (!stagePickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (stagePickerRef.current && !stagePickerRef.current.contains(e.target as Node)) {
        setStagePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stagePickerOpen]);

  async function handleStageSelect(funnelStatus: string) {
    if (advanceSaving || funnelStatus === lead.funnel_status) return;
    setAdvanceSaving(true);
    setActionError(null);
    const res = await fetch(`/api/leads/${leadId}/advance-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnel_status: funnelStatus }),
    });
    setAdvanceSaving(false);
    if (res.ok) {
      setStagePickerOpen(false);
      onReload();
    } else {
      const json = await res.json().catch(() => ({}));
      setActionError(json.error ?? 'İşlem başarısız');
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
    if (res.ok) {
      onClose();
    } else {
      setActionError('Silme başarısız');
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/leads/${leadId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'lost' }),
    });
    if (res.ok) {
      onClose();
    } else {
      setActionError('Arşivleme başarısız');
    }
  }

  return (
    <div className="shrink-0 border-t border-border-default bg-surface-primary px-4 py-3">
      {actionError && <p className="mb-2 text-xs text-brand-red">{actionError}</p>}

      {/* Stage change — tap to open list, pick to advance, click outside to close */}
      {!isTerminal && (
        <div ref={stagePickerRef} className="relative mb-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full justify-between"
            disabled={advanceSaving}
            onClick={() => setStagePickerOpen((open) => !open)}
          >
            <span>{currentStageLabel}</span>
            <span className="text-[11px] font-normal text-text-tertiary">
              {advanceSaving ? t('common.saving') : 'Aşamayı değiştir'}
            </span>
          </Button>

          {stagePickerOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-56 overflow-y-auto rounded-lg border border-border-default bg-surface-card py-1 shadow-lg">
              {stageOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={advanceSaving}
                  className={cn(
                    'flex w-full px-3 py-2 text-left text-sm hover:bg-surface-secondary',
                    advanceSaving && 'opacity-50',
                  )}
                  onClick={() => void handleStageSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Primary stage-action */}
      {!isTerminal && (
        <div className="mb-2">
          <Button type="button" size="sm" className="w-full" onClick={onPrimaryAction}>
            {primaryActionLabel(lead.funnel_status)}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canManage && (
          <>
            {!archiveConfirm ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-text-secondary"
                onClick={() => setArchiveConfirm(true)}
              >
                Arşivle
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={handleArchive}
                >
                  Onayla
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setArchiveConfirm(false)}
                >
                  İptal
                </Button>
              </div>
            )}

            {!deleteConfirm ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-brand-red"
                onClick={() => setDeleteConfirm(true)}
              >
                Sil
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={handleDelete}
                >
                  Kalıcı sil
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setDeleteConfirm(false)}
                >
                  İptal
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
