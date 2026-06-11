/**
 * Root page — redirects to My Day.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my-day');
  }, [router]);

  return null;
}
