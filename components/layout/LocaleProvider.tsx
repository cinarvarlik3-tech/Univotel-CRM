/**
 * Locale provider — manages Turkish/English UI language preference.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createTranslator } from '@/lib/i18n/create-translator';
import type { TranslateFn } from '@/lib/i18n/create-translator';
import { getMessages } from '@/lib/i18n';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from '@/lib/i18n/types';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

/**
 * Provides locale context and persists user language preference.
 * @param props - Child components.
 * @returns Locale context provider.
 */
export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const t = useMemo(() => createTranslator(getMessages(locale)), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Reads current locale context.
 * @returns Locale context value.
 */
export function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocaleContext must be used within LocaleProvider');
  return ctx;
}
