/**
 * Inline-editable university field for the lead detail panel.
 * Uses the searchable UniversityCombobox backed by the universities table.
 * School shortname is synced separately via useDebouncedSchoolShortnameSync.
 */
import { useEffect, useRef, useState } from 'react';
import { IconPencil } from '@tabler/icons-react';
import { UniversityCombobox } from '@/components/ui/university-combobox';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import type { UniversityRow } from '@/types/domain';

export interface SelectOption {
  value: string;
  label: string;
}

interface InlineUniversityFieldProps {
  label: string;
  value: string | null | undefined;
  universities: UniversityRow[];
  loading?: boolean;
  onSave: (university: string | null) => Promise<void>;
  className?: string;
  /** Optional year sub-field rendered side-by-side inside the same card. */
  uniYear?: string | null | undefined;
  uniYearOptions?: SelectOption[];
  onSaveYear?: (year: string | null) => Promise<void>;
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
  uniYear,
  uniYearOptions,
  onSaveYear,
}: InlineUniversityFieldProps) {
  const { t } = useTranslation();
  const editRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draftUniversity, setDraftUniversity] = useState('');
  const [draftYear, setDraftYear] = useState('');

  const hasYear = uniYearOptions !== undefined && onSaveYear !== undefined;

  useEffect(() => {
    if (!editing) return;
    function handleClickOutside(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing]);

  function startEdit() {
    setDraftUniversity(value ?? '');
    setDraftYear(uniYear ?? '');
    setEditing(true);
  }

  async function saveUniversity(uniName: string | null) {
    setDraftUniversity(uniName ?? '');
    await onSave(uniName);
    if (!hasYear) setEditing(false);
  }

  async function saveYear(year: string | null) {
    if (!onSaveYear) return;
    setDraftYear(year ?? '');
    await onSaveYear(year);
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        ref={editRef}
        className={cn(
          'rounded-lg border-2 border-brand-blue bg-surface-card p-3 ring-4 ring-brand-blue-light',
          className,
        )}
      >
        <div className={cn('gap-3', hasYear ? 'grid grid-cols-2' : 'block')}>
          {/* University name */}
          <div>
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
                  void saveUniversity(uniName || null);
                }}
                onClear={() => {
                  setDraftUniversity('');
                  void saveUniversity(null);
                }}
              />
            </div>
          </div>

          {/* Year sub-field */}
          {hasYear && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
                Üniversite yılı
              </p>
              <select
                value={draftYear}
                onChange={(e) => {
                  const year = e.target.value;
                  void saveYear(year || null);
                }}
                className="mt-2 w-full rounded-md border border-border-strong bg-surface-page px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand-blue"
              >
                <option value="">—</option>
                {uniYearOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={startEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEdit();
        }
      }}
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border-default bg-surface-card p-3 transition-colors hover:border-border-strong',
        className,
      )}
    >
      {hasYear ? (
        /* Two-column display when year is embedded */
        <div className="grid grid-cols-2 gap-x-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              {label}
            </p>
            <div className="mt-1.5 text-sm font-medium text-text-primary">
              {value ?? (
                <span className="font-normal text-text-tertiary">{t('common.emDash')}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Üniversite yılı
            </p>
            <div className="mt-1.5 text-sm font-medium text-text-primary">
              {uniYear ? (
                (uniYearOptions?.find((o) => o.value === uniYear)?.label ?? uniYear)
              ) : (
                <span className="font-normal text-text-tertiary">{t('common.emDash')}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {label}
          </p>
          <div className="mt-1.5 text-sm font-medium text-text-primary">
            {value ?? <span className="font-normal text-text-tertiary">{t('common.emDash')}</span>}
          </div>
        </>
      )}
      <IconPencil
        className="pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </div>
  );
}
