/**
 * Settings page — theme preference, language, and account info.
 */
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { formatRoleLabel } from '@/lib/i18n/enum-labels';
import type { Locale } from '@/lib/i18n/types';

/**
 * Renders user settings including color mode and language toggle.
 * @returns Settings page wrapped in AppShell.
 */
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();

  return (
    <AppShell title={t('settings.title')}>
      <div className="mx-auto max-w-lg space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
            <CardDescription>{t('settings.languageDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField label={t('settings.language')} htmlFor="locale-select">
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger id="locale-select">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">{t('settings.languageTr')}</SelectItem>
                  <SelectItem value="en">{t('settings.languageEn')}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.appearance')}</CardTitle>
            <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField label={t('settings.colorMode')} htmlFor="theme-select">
              <Select
                value={theme}
                onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
              >
                <SelectTrigger id="theme-select">
                  <SelectValue placeholder={t('common.selectTheme')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('settings.themeSystem')}</SelectItem>
                  <SelectItem value="light">{t('settings.themeLight')}</SelectItem>
                  <SelectItem value="dark">{t('settings.themeDark')}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {user && (
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.account')}</CardTitle>
              <CardDescription>
                {user.salesperson.full_name} · {formatRoleLabel(locale, user.role)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={logout}>
                {t('settings.signOut')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
