import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { FUNNEL_STATUSES } from '@/lib/constants';

interface QuickStageAdvanceProps {
  leadUuid: string;
  currentStatus: string;
  /** Subset of statuses to allow. Defaults to all non-lost statuses. */
  allowedStatuses?: readonly string[];
  onSuccess: () => void;
}

const DEFAULT_ALLOWED = FUNNEL_STATUSES.filter((s) => s !== 'lost');

export function QuickStageAdvance({
  leadUuid,
  currentStatus,
  allowedStatuses = DEFAULT_ALLOWED,
  onSuccess,
}: QuickStageAdvanceProps) {
  const { locale, t } = useTranslation();
  const options = allowedStatuses
    .filter((s) => s !== currentStatus)
    .map((s) => ({ value: s, label: formatEnumLabel(locale, 'funnel', s) }));

  const [selected, setSelected] = useState(options[0]?.value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdvance() {
    if (!selected) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadUuid}/advance-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnel_status: selected }),
    });

    setSaving(false);

    if (res.ok) {
      onSuccess();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Failed');
    }
  }

  if (options.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        {t('actions.advanceStageTitle')}
      </p>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <FormSelect
            value={selected}
            onValueChange={setSelected}
            options={options}
            placeholder={t('actions.selectStage')}
          />
        </div>
        <Button type="button" size="sm" onClick={handleAdvance} disabled={saving || !selected}>
          {saving ? t('common.saving') : t('actions.advance')}
        </Button>
      </div>
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}
