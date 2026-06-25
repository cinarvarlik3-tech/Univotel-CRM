/**
 * Lead picker for form fields — replaces raw UUID inputs (D27, §7.2).
 * Searches by name/phone via `search_leads_global` RPC and emits the selected UUID.
 * When pre-filled (e.g. from a lead's slide-over), shows the lead name read-only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { InactiveLeadBadge } from '@/components/leads/InactiveLeadBadge';

interface SearchResult {
  uuid: string;
  lead_name: string | null;
  display_name: string | null;
  lead_phone: string | null;
  funnel_status: string | null;
  is_inactive?: boolean;
}

interface LeadPickerInputProps {
  /** The currently-selected lead UUID (controlled). */
  value: string;
  /** Called when a lead is selected or cleared. */
  onChange: (uuid: string, label: string) => void;
  /** Optional pre-filled label (lead name) to show without re-fetching. */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

function effectiveName(r: SearchResult): string {
  return r.display_name ?? r.lead_name ?? r.lead_phone ?? '—';
}

/**
 * A search-as-you-type lead selector for use in forms.
 */
export function LeadPickerInput({
  value,
  onChange,
  label,
  placeholder = 'İsim veya telefon ara...',
  disabled = false,
  id,
}: LeadPickerInputProps) {
  const [query, setQuery] = useState(label ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request id — only the latest in-flight search may update state.
  const reqIdRef = useRef(0);

  // If label changes externally (pre-fill), sync the display
  useEffect(() => {
    if (label && !query) setQuery(label);
  }, [label]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.rpc('search_leads_global', {
        q: q.trim(),
        result_limit: 8,
      });
      // Drop the response if a newer search has started since.
      if (reqId !== reqIdRef.current) return;
      if (!error) setResults((data as SearchResult[]) ?? []);
    } catch {
      // Network/abort error — leave results as-is; finally clears the spinner.
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(r: SearchResult) {
    const displayLabel = effectiveName(r);
    setQuery(displayLabel);
    setOpen(false);
    setResults([]);
    onChange(r.uuid, displayLabel);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    onChange('', '');
  }

  const showDropdown = open && (loading || results.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <input
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange('', '');
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            'h-9 w-full rounded-md border border-border-default bg-surface-secondary pl-8 pr-8 text-sm',
            'placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-blue',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        />
        {(query || value) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <IconX className="size-3.5" />
          </button>
        )}
      </div>
      {/* Hidden input for form value */}
      <input type="hidden" value={value} />

      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border-default bg-surface-card shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-text-tertiary">Aranıyor...</div>}
          {!loading &&
            results.map((r) => (
              <button
                key={r.uuid}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-secondary"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(r)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate font-medium">{effectiveName(r)}</span>
                    {r.is_inactive && <InactiveLeadBadge />}
                  </div>
                  {r.lead_phone && (
                    <div className="truncate text-xs text-text-secondary">{r.lead_phone}</div>
                  )}
                </div>
                {r.funnel_status && (
                  <span className="shrink-0 rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] text-text-secondary">
                    {r.funnel_status}
                  </span>
                )}
              </button>
            ))}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-3 text-xs text-text-secondary">Lead bulunamadı.</div>
          )}
        </div>
      )}
    </div>
  );
}
