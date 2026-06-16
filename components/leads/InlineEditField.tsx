/**
 * Per-field box-card widgets for the lead detail panel.
 *
 * InlineEditField — shows label + value as a card; pencil opens inline edit.
 * ReadOnlyField   — same card style but no edit interaction.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconCheck, IconPencil, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateOnly } from '@/lib/i18n/format-date';
import { type Locale } from '@/lib/i18n/types';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'multiselect';

/** Extracts the YYYY-MM-DD portion from an ISO date/timestamp string. */
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// ─── ReadOnlyField ────────────────────────────────────────────────────────────

interface ReadOnlyFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
}

/**
 * Read-only box-card field. Same look as InlineEditField but no pencil.
 */
export function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps) {
  return (
    <div className={cn('rounded-lg border border-border-default bg-surface-card p-3', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-medium text-text-primary">
        {value ?? <span className="font-normal text-text-tertiary">—</span>}
      </div>
    </div>
  );
}

// ─── InlineEditField ──────────────────────────────────────────────────────────

interface BaseProps {
  label: string;
  type?: FieldType;
  options?: SelectOption[];
  nullable?: boolean;
  onSave: (value: string | string[] | null) => Promise<void>;
  className?: string;
}

interface TextProps extends BaseProps {
  type?: 'text' | 'textarea' | 'date';
  value: string | null | undefined;
}

interface SelectProps extends BaseProps {
  type: 'select';
  value: string | null | undefined;
  options: SelectOption[];
}

interface MultiSelectProps extends BaseProps {
  type: 'multiselect';
  value: string[] | null | undefined;
  options: SelectOption[];
}

type InlineEditFieldProps = TextProps | SelectProps | MultiSelectProps;

function displayValue(
  type: FieldType,
  value: string | string[] | null | undefined,
  options: SelectOption[] | undefined,
  locale: Locale,
): ReactNode {
  if (type === 'multiselect') {
    const arr = value as string[] | null | undefined;
    if (!arr?.length) return null;
    return arr.map((v) => options?.find((o) => o.value === v)?.label ?? v).join(', ');
  }
  const str = value as string | null | undefined;
  if (!str) return null;
  if (type === 'select') return options?.find((o) => o.value === str)?.label ?? str;
  if (type === 'textarea') return <span className="whitespace-pre-wrap">{str}</span>;
  if (type === 'date') {
    return formatDateOnly(str, locale);
  }
  return str;
}

/**
 * Box-card field with inline edit. Label at top, value below, pencil in corner.
 */
export function InlineEditField({
  label,
  type = 'text',
  value,
  options,
  nullable,
  onSave,
  className,
}: InlineEditFieldProps) {
  const { locale, t } = useTranslation();
  const editRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftText, setDraftText] = useState('');
  const [draftSelect, setDraftSelect] = useState('');
  const [draftMulti, setDraftMulti] = useState<string[]>([]);

  function startEdit() {
    if (type === 'multiselect') {
      setDraftMulti((value as string[] | null | undefined) ?? []);
    } else if (type === 'select') {
      setDraftSelect((value as string | null | undefined) ?? '');
    } else if (type === 'date') {
      setDraftText(toDateInputValue(value as string | null | undefined));
    } else {
      setDraftText((value as string | null | undefined) ?? '');
    }
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
      let next: string | string[] | null;
      if (type === 'multiselect') {
        next = draftMulti;
      } else if (type === 'select') {
        next = draftSelect || (nullable ? null : draftSelect);
      } else {
        next = draftText.trim() || (nullable ? null : draftText.trim());
      }
      await onSave(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('leads.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function toggleMulti(val: string) {
    const next = draftMulti.includes(val)
      ? draftMulti.filter((v) => v !== val)
      : [...draftMulti, val];
    setDraftMulti(next);
    setSaving(true);
    setError(null);
    void onSave(next)
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('leads.saveFailed'));
        setDraftMulti((value as string[] | null | undefined) ?? []);
      })
      .finally(() => setSaving(false));
  }

  const needsExplicitSave = type === 'text' || type === 'textarea';

  useEffect(() => {
    if (!editing || needsExplicitSave) return;
    function handleClickOutside(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditing(false);
        setError(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing, needsExplicitSave]);

  const displayed = displayValue(type, value, options, locale);

  if (editing) {
    return (
      <div
        ref={editRef}
        className={cn(
          'rounded-lg border-2 border-brand-blue bg-surface-card p-3 ring-4 ring-brand-blue-light',
          className,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
          {label}
        </p>

        <div className="mt-2">
          {type === 'text' && (
            <input
              autoFocus
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
              }}
              className="w-full rounded-md border border-border-strong bg-surface-page px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand-blue"
            />
          )}

          {type === 'textarea' && (
            <textarea
              autoFocus
              rows={5}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
              }}
              className="w-full resize-none rounded-md border border-border-strong bg-surface-page px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand-blue"
            />
          )}

          {type === 'date' && (
            <input
              autoFocus
              type="date"
              value={draftText}
              onChange={(e) => {
                const nextVal = e.target.value;
                setDraftText(nextVal);
                setSaving(true);
                setError(null);
                const next = nextVal || (nullable ? null : nextVal);
                onSave(next)
                  .then(() => setEditing(false))
                  .catch((err) => {
                    setError(err instanceof Error ? err.message : t('leads.saveFailed'));
                  })
                  .finally(() => setSaving(false));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
              }}
              className="w-full rounded-md border border-border-strong bg-surface-page px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand-blue"
            />
          )}

          {type === 'select' && (
            // D23: auto-save on select change — no explicit Save button needed.
            <select
              autoFocus
              value={draftSelect}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
              }}
              onChange={(e) => {
                setDraftSelect(e.target.value);
                // Trigger save with the new value directly (don't rely on state update timing)
                setSaving(true);
                setError(null);
                const next = e.target.value || (nullable ? null : e.target.value);
                onSave(next)
                  .then(() => setEditing(false))
                  .catch((err) => {
                    setError(err instanceof Error ? err.message : t('leads.saveFailed'));
                  })
                  .finally(() => setSaving(false));
              }}
              className="w-full rounded-md border border-border-strong bg-surface-page px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-brand-blue"
            >
              {nullable && <option value="">—</option>}
              {options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          {type === 'multiselect' && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {options?.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={saving}
                  onClick={() => toggleMulti(o.value)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                    draftMulti.includes(o.value)
                      ? 'bg-brand-blue text-white ring-brand-blue'
                      : 'bg-surface-page text-text-secondary ring-border-strong hover:ring-border-strong',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-1.5 text-xs text-brand-red">{error}</p>}

        {needsExplicitSave && (
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
        )}
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-medium text-text-primary">
        {displayed ?? <span className="font-normal text-text-tertiary">—</span>}
      </div>
      <IconPencil
        className="pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </div>
  );
}
