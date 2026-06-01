/**
 * Login page — Supabase email/password authentication.
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { UnivotelLogo } from '@/components/layout/UnivotelLogo';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Renders login form for CRM access.
 * @returns Login page with email/password form.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();
  const { t } = useTranslation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    await refresh();
    router.push('/leads');
  }

  return (
    <>
      <Head>
        <title>{t('auth.signInTitle')}</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-surface-page p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <UnivotelLogo size={48} className="mb-2" />
            <CardTitle className="font-heading text-[22px]">{t('app.name')}</CardTitle>
            <CardDescription>{t('auth.signInHeading')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FormField label={t('auth.email')} htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </FormField>
              <FormField label={t('auth.password')} htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </FormField>
              {error && <p className="text-xs text-brand-red">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
