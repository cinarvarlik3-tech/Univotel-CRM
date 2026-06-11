/**
 * Inline-editable university field for the lead detail panel.
 * Uses the searchable UniversityCombobox backed by the universities table.
 * School shortname is synced separately via useDebouncedSchoolShortnameSync.
 */
import { useState } from 'react';
import { IconCheck, IconPencil, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { UniversityCombobox } from '@/components/ui/university-combobox';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import type { UniversityRow } from '@/types/domain';

interface InlineUniversityFieldProps {
  label: string;
  value: string | null | undefined;
  universities: UniversityRow[];
  loading?: boolean;
  onSave: (university: string | null) => Promise<void>;
  className?: string;
}

/**
 * Box-card university picker with searchable dropdown (Profil tab).
 */
export function InlineUniversityField({
  label,
  value,
  universities,
  loading,
  onSave,
  className,
}: InlineUniversityFieldProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftUniversity, setDraftUniversity] = useState('');

  function startEdit() {
    setDraftUniversity(value ?? '');
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const uni = draftUniversity.trim() || null;
      await onSave(uni);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('leads.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-brand-blue bg-surface-card p-3 ring-4 ring-brand-blue-light',
          className,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
          {label}
        </p>

        <div className="relative z-20 mt-2">
          <UniversityCombobox
            id="profil-university"
            listboxId="profil-university-listbox"
            autoFocus
            value={draftUniversity}
            universities={universities}
            loading={loading}
            placeholder={t('leads.universitySearchPlaceholder')}
            onSelect={(uniName) => {
              setDraftUniversity(uniName);
            }}
            onClear={() => {
              setDraftUniversity('');
            }}
          />
        </div>

        {error && <p className="mt-1.5 text-xs text-brand-red">{error}</p>}

        <div className="mt-3 flex gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={saving}
            onClick={() => void save()}
          >
            <IconCheck className="size-3.5" />
            {saving ? t('common.saving') : t('common.save')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={saving}
            onClick={cancel}
          >
            <IconX className="size-3.5" />
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border-default bg-surface-card p-3 transition-colors hover:border-border-strong',
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-medium text-text-primary">
        {value ?? <span className="font-normal text-text-tertiary">{t('common.emDash')}</span>}
      </div>
      <button
        type="button"
        onClick={startEdit}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-text-tertiary opacity-0 transition-all hover:bg-surface-page hover:text-text-primary group-hover:opacity-100"
        aria-label={t('common.edit')}
      >
        <IconPencil className="size-3.5" />
      </button>
    </div>
  );
}
