/**
 * Settings page — theme preference, language, and account info.
 */
import { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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

  const isSuperadmin = user?.role === 'superadmin';
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [killSwitchSaving, setKillSwitchSaving] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) return;
    void fetch('/api/notifications/kill-switch')
      .then((r) => r.json())
      .then((d: { data?: { enabled: boolean } }) => {
        if (d.data != null) setNotificationsEnabled(d.data.enabled);
      });
  }, [isSuperadmin]);

  async function toggleNotifications(enabled: boolean) {
    setKillSwitchSaving(true);
    try {
      const res = await fetch('/api/notifications/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) setNotificationsEnabled(enabled);
    } finally {
      setKillSwitchSaving(false);
    }
  }

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

        {isSuperadmin && notificationsEnabled !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Telegram Bildirimleri</CardTitle>
              <CardDescription>
                Kapalıyken yalnızca webhook hata bildirimleri iletilir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={notificationsEnabled}
                  disabled={killSwitchSaving}
                  onCheckedChange={(checked) => {
                    void toggleNotifications(checked === true);
                  }}
                />
                <span className="text-sm">
                  {notificationsEnabled ? 'Bildirimler aktif' : 'Bildirimler kapalı'}
                </span>
              </label>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
