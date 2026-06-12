/**
 * Global quick-search — always accessible, every screen (D14, §4.6).
 * Searches all leads by name or phone via the `search_leads_global` RPC (SECURITY DEFINER,
 * broad visibility — the only place a salesperson can reach another rep's lead).
 * Recently-searched list opens on focus (backed by `recent_searches` table).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconSearch, IconX, IconClock, IconPhone } from '@tabler/icons-react';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { InactiveLeadBadge } from '@/components/leads/InactiveLeadBadge';

interface SearchResult {
  uuid: string;
  lead_name: string | null;
  display_name: string | null;
  lead_phone: string | null;
  funnel_status: string | null;
  assigned_to: string | null;
  is_inactive?: boolean;
}

interface RecentSearch {
  lead_uuid: string;
  lead_name: string | null;
  display_name: string | null;
  lead_phone: string | null;
}

interface GlobalQuickSearchProps {
  /** Called when user selects a lead — open its side panel. */
  onSelectLead: (uuid: string) => void;
}

function effectiveName(result: { lead_name: string | null; display_name: string | null }): string {
  return result.display_name ?? result.lead_name ?? '—';
}

/**
 * Renders the global quick-search input with dropdown results and recently-searched list.
 */
export function GlobalQuickSearch({ onSelectLead }: GlobalQuickSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recently-searched leads on open
  const loadRecents = useCallback(async () => {
    const res = await fetch('/api/leads/recent-searches');
    if (!res.ok) return;
    const json = await res.json();
    setRecents(json.data ?? []);
  }, []);

  // Search via RPC
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.rpc('search_leads_global', {
      q: q.trim(),
      result_limit: 10,
    });
    setLoading(false);
    if (!error) setResults((data as SearchResult[]) ?? []);
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

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        loadRecents();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, loadRecents]);

  async function handleSelect(uuid: string) {
    setOpen(false);
    setQuery('');
    setResults([]);
    onSelectLead(uuid);
    // Record recent search
    await fetch(`/api/leads/recent-searches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_uuid: uuid }),
    });
  }

  function handleFocus() {
    setOpen(true);
    loadRecents();
  }

  const showRecents = query.trim().length < 2 && recents.length > 0;
  const showResults = query.trim().length >= 2;
  const dropdownVisible = open && (showRecents || showResults || loading);

  return (
    <div ref={containerRef} className="relative w-full max-w-[320px]">
      <div className="relative">
        <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Lead ara... (⌘K)"
          className={cn(
            'h-8 w-full rounded-md border border-border-default bg-surface-secondary pl-8 pr-8 text-sm',
            'placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-blue',
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <IconX className="size-3.5" />
          </button>
        )}
      </div>

      {dropdownVisible && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[300px] overflow-hidden rounded-lg border border-border-default bg-surface-card shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-text-tertiary">Aranıyor...</div>}

          {/* Recently searched */}
          {showRecents && !loading && (
            <>
              <div className="border-b border-border-default px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Son aramalar
                </span>
              </div>
              {recents.map((r) => (
                <button
                  key={r.lead_uuid}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-secondary"
                  onClick={() => handleSelect(r.lead_uuid)}
                >
                  <IconClock className="size-3.5 shrink-0 text-text-tertiary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{effectiveName(r)}</div>
                    {r.lead_phone && (
                      <div className="truncate text-xs text-text-secondary">{r.lead_phone}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Search results */}
          {showResults && !loading && results.length > 0 && (
            <>
              <div className="border-b border-border-default px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Sonuçlar
                </span>
              </div>
              {results.map((r) => (
                <button
                  key={r.uuid}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-secondary"
                  onClick={() => handleSelect(r.uuid)}
                >
                  <IconPhone className="size-3.5 shrink-0 text-text-tertiary" />
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
            </>
          )}

          {showResults && !loading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-text-secondary">Lead bulunamadı.</div>
          )}
        </div>
      )}
    </div>
  );
}
