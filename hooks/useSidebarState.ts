/**
 * Simple persisted sidebar collapse state.
 * Sidebar writes; AppShell reads to size content offset.
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

/** Returns [collapsed, toggleCollapsed] — persisted to localStorage. */
export function useSidebarState(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  return [collapsed, toggle];
}
