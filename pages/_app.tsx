/**
 * Next.js custom App component — wraps all pages with auth provider and global styles.
 */
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/hooks/useAuth';
import '@/styles/globals.css';

/**
 * Root application component.
 * @param props - Next.js AppProps with Component and pageProps.
 * @returns Rendered page wrapped in AuthProvider.
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
