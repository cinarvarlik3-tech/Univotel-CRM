/**
 * FMS filter context — threads includeKapora across dashboard pages.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type FmsFilterContextValue = {
  includeKapora: boolean;
  setIncludeKapora: (value: boolean) => void;
};

const FmsFilterContext = createContext<FmsFilterContextValue | null>(null);

export function FmsFilterProvider({ children }: { children: ReactNode }) {
  const [includeKapora, setIncludeKapora] = useState(false);
  const value = useMemo(() => ({ includeKapora, setIncludeKapora }), [includeKapora]);
  return <FmsFilterContext.Provider value={value}>{children}</FmsFilterContext.Provider>;
}

export function useFmsFilter(): FmsFilterContextValue {
  const ctx = useContext(FmsFilterContext);
  if (!ctx) {
    return { includeKapora: false, setIncludeKapora: () => undefined };
  }
  return ctx;
}
