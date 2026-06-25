/**
 * FMS dual search bar — 70/30 partner/property comboboxes in one housing.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { useFmsLookups } from '@/hooks/useFms';
import { useTranslation } from '@/hooks/useTranslation';
import { UNATTRIBUTED_PARTNER_ID } from '@/lib/finance/constants';
import { cn } from '@/lib/utils';

const VISIBLE_OPTIONS = 4;
const OPTION_ROW_HEIGHT = 36;
const DROPDOWN_MAX_HEIGHT = VISIBLE_OPTIONS * OPTION_ROW_HEIGHT;

type LookupOption = { id: string; name: string };

interface FmsSearchComboboxProps {
  label: string;
  placeholder: string;
  options: LookupOption[];
  selectedId: string | null;
  selectedLabel?: string;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  resolveLabel?: (option: LookupOption) => string;
  className?: string;
}

function FmsSearchCombobox({
  label,
  placeholder,
  options,
  selectedId,
  selectedLabel,
  onSelect,
  disabled,
  resolveLabel,
  className,
}: FmsSearchComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [displayLabel, setDisplayLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedLabel) {
      setDisplayLabel(selectedLabel);
    } else if (!selectedId) {
      setDisplayLabel('');
    }
  }, [selectedId, selectedLabel]);

  const displayValue = open ? query : displayLabel;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => {
          const labelText = resolveLabel ? resolveLabel(o) : o.name;
          return labelText.toLowerCase().includes(q);
        })
      : options;
    return list;
  }, [options, query, resolveLabel]);

  const pickOption = (option: LookupOption) => {
    const labelText = resolveLabel ? resolveLabel(option) : option.name;
    onSelect(option.id);
    setDisplayLabel(labelText);
    setOpen(false);
    setQuery('');
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      <label className="mb-1 block text-[11px] font-medium text-text-tertiary">{label}</label>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          className="pr-8"
        />
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
          {selectedId && !open ? (
            <button
              type="button"
              className="pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setDisplayLabel('');
                setQuery('');
              }}
              aria-label="Clear"
            >
              <IconX className="h-4 w-4" />
            </button>
          ) : (
            <IconSearch className="h-4 w-4" />
          )}
        </div>
      </div>

      {open && !disabled && (
        <ul
          className="absolute z-50 mt-1 w-full overflow-y-auto rounded-lg border border-border-default bg-surface-card py-1 shadow-sm"
          style={{ maxHeight: DROPDOWN_MAX_HEIGHT }}
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-text-tertiary">—</li>
          ) : (
            filtered.map((option) => {
              const labelText = resolveLabel ? resolveLabel(option) : option.name;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedId === option.id}
                    className={cn(
                      'flex w-full items-center px-3 text-left text-sm hover:bg-row-hover',
                      selectedId === option.id && 'bg-row-selected font-medium',
                    )}
                    style={{ minHeight: OPTION_ROW_HEIGHT }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickOption(option);
                    }}
                  >
                    <span className="truncate">{labelText}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

interface FmsSearchBarProps {
  partnerId: string | null;
  propertyId: string | null;
  onPartnerChange: (id: string | null) => void;
  onPropertyChange: (id: string | null) => void;
}

export function FmsSearchBar({
  partnerId,
  propertyId,
  onPartnerChange,
  onPropertyChange,
}: FmsSearchBarProps) {
  const { t } = useTranslation();
  const { data: lookups } = useFmsLookups(partnerId);

  const partners = useMemo(() => lookups?.partners ?? [], [lookups?.partners]);
  const properties = useMemo(() => lookups?.properties ?? [], [lookups?.properties]);

  const partnerLabel = useMemo(() => {
    if (!partnerId) return undefined;
    if (partnerId === UNATTRIBUTED_PARTNER_ID) return t('fms.unattributed');
    return partners.find((p) => p.id === partnerId)?.name;
  }, [partnerId, partners, t]);

  const propertyLabel = useMemo(() => {
    if (!propertyId) return undefined;
    return properties.find((p) => p.id === propertyId)?.name;
  }, [propertyId, properties]);

  return (
    <div className="flex w-full gap-3 rounded-2xl border border-brand-blue-mid/25 bg-brand-blue-mid/20 px-4 py-3 shadow-sm">
      <FmsSearchCombobox
        className="w-[70%]"
        label={t('fms.searchPartner')}
        placeholder={t('fms.searchPartnerPlaceholder')}
        options={partners}
        selectedId={partnerId}
        selectedLabel={partnerLabel}
        onSelect={onPartnerChange}
        resolveLabel={(o) => (o.id === UNATTRIBUTED_PARTNER_ID ? t('fms.unattributed') : o.name)}
      />
      <FmsSearchCombobox
        className="w-[30%]"
        label={t('fms.searchProperty')}
        placeholder={t('fms.searchPropertyPlaceholder')}
        options={properties}
        selectedId={propertyId}
        selectedLabel={propertyLabel}
        onSelect={onPropertyChange}
      />
    </div>
  );
}
