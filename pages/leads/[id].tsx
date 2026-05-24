/**
 * Lead detail deep-link — redirects to leads list with panel open.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirects /leads/[id] to /leads?selected=[id] for slide-over panel.
 * @returns Null during redirect.
 */
export default function LeadDetailRedirectPage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (typeof id === 'string') {
      router.replace({ pathname: '/leads', query: { selected: id } });
    }
  }, [id, router]);

  return null;
}
