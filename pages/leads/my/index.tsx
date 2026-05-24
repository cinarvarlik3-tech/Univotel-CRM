/**
 * Alias route — redirects /leads/my to canonical /leads/mine.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirects to /leads/mine preserving query string.
 * @returns Null while redirecting.
 */
export default function MyLeadsAliasPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    router.replace({ pathname: '/leads/mine', query: router.query });
  }, [router]);

  return null;
}
