/**
 * Searchable combobox for university selection.
 * Matches uni_name, uni_shortname (school shortname), and campus district —
 * with Turkish + ASCII folding so "ITU" matches "İTÜ".
 *
 * Built without external popover libraries — uses a focus-managed
 * portaled listbox anchored to the input wrapper.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { filterUniversitiesForSearch } from '@/lib/universities/search';
import type { UniversityRow } from '@/types/domain';

interface UniversityComboboxProps {
  /** Current uni_name value (persisted in lead_details.university). */
  value: string;
  /** Callback fired when user selects a university from the list. */
  onSelect: (uniName: string, shortname: string) => void;
  /** Callback fired when user clears the selection. */
  onClear: () => void;
  /** Available universities (from useUniversities hook). */
  universities: UniversityRow[];
  /** Whether the combobox is loading data. */
  loading?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** id forwarded to the underlying input for label association. */
  id?: string;
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Focus the search input on mount. */
  autoFocus?: boolean;
  /** Unique id prefix for listbox aria nodes (avoid collisions when multiple on page). */
  listboxId?: string;
  className?: string;
}

const MAX_FILTERED_RESULTS = 50;

/**
 * Searchable university combobox with acronym-aware matching.
 * @param props - Combobox props.
 * @returns Combobox element.
 */
export function UniversityCombobox({
  value,
  onSelect,
  onClear,
  universities,
  loading,
  disabled,
  id,
  placeholder,
  autoFocus = false,
  listboxId = 'university-listbox',
  className,
}: UniversityComboboxProps) {
  // inputValue drives the search; synced to value when closed or on external update
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep inputValue in sync when external value changes (e.g. detail reload)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = useMemo(
    () => filterUniversitiesForSearch(universities, inputValue, MAX_FILTERED_RESULTS),
    [universities, inputValue],
  );

  const openList = useCallback(() => {
    setOpen(true);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      openList();
    }
  }, [autoFocus, openList]);

  const closeList = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    // If user typed something that isn't a recognised name, revert to committed value
    setInputValue(value);
  }, [value]);

  const handleSelect = useCallback(
    (uni: UniversityRow) => {
      onSelect(uni.uni_name, uni.uni_shortname);
      setInputValue(uni.uni_name);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelect],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear();
      setInputValue('');
      setOpen(false);
      inputRef.current?.focus();
    },
    [onClear],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      closeList();
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, closeList]);

  // Position portaled dropdown below the input (avoids clipping in scroll panels)
  useEffect(() => {
    if (!open || !wrapperRef.current) {
      setAnchor(null);
      return;
    }

    const update = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, inputValue]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openList();
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          handleSelect(filtered[activeIndex]);
        }
        break;
      case 'Escape':
      case 'Tab':
        closeList();
        break;
    }
  }

  const showClear = !!value && !disabled;

  const listbox = open ? (
    <ul
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-label="Üniversite listesi"
      style={
        anchor
          ? {
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              width: anchor.width,
              zIndex: 9999,
            }
          : undefined
      }
      className={cn(
        'max-h-60 overflow-y-auto',
        'rounded-lg border border-border-default bg-surface-card shadow-md',
        !anchor && 'absolute left-0 right-0 z-50 mt-1',
      )}
    >
      {filtered.length === 0 ? (
        <li className="px-3 py-2 text-sm text-text-secondary">Sonuç bulunamadı</li>
      ) : (
        filtered.map((uni, idx) => (
          <li
            key={uni.id}
            id={`${listboxId}-option-${idx}`}
            role="option"
            aria-selected={uni.uni_name === value}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(uni);
            }}
            onMouseEnter={() => setActiveIndex(idx)}
            className={cn(
              'flex cursor-pointer flex-col px-3 py-2 text-sm',
              'hover:bg-brand-blue-light hover:text-brand-blue',
              idx === activeIndex && 'bg-brand-blue-light text-brand-blue',
              uni.uni_name === value && 'font-medium',
            )}
          >
            <span className="leading-tight">{uni.uni_name}</span>
            <span className="text-xs opacity-60">
              {uni.uni_shortname}
              {uni.district ? ` · ${uni.district}` : ''}
            </span>
          </li>
        ))
      )}
    </ul>
  ) : null;

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Input + icons */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder ?? (loading ? 'Yükleniyor…' : 'Üniversite ara…')}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!open) openList();
          }}
          onFocus={openList}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-9 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 pr-16 text-sm text-text-primary placeholder:text-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <span className="pointer-events-none absolute right-8 flex items-center text-text-secondary">
          <IconChevronDown className="size-4 opacity-50" />
        </span>
        {showClear && (
          <button
            type="button"
            aria-label="Üniversiteyi temizle"
            onClick={handleClear}
            className="absolute right-2 flex size-5 items-center justify-center rounded text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <IconX className="size-3.5" />
          </button>
        )}
      </div>

      {mounted && listbox ? createPortal(listbox, document.body) : null}
    </div>
  );
}
