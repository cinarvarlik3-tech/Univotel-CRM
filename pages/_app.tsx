/**
 * Next.js custom App component — wraps all pages with providers and global styles.
 */
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/hooks/useAuth';
import { LocaleProvider } from '@/components/layout/LocaleProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import '@/styles/globals.css';

/**
 * Root application component.
 * @param props - Next.js AppProps with Component and pageProps.
 * @returns Rendered page wrapped in providers.
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
