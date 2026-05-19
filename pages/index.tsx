/**
 * Root page — redirects to leads list.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Home page that redirects to /leads.
 * @returns Null render during redirect.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leads');
  }, [router]);

  return null;
}
