/**
 * Settings page — theme preference and account info.
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
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';

/**
 * Renders user settings including color mode toggle.
 * @returns Settings page wrapped in AppShell.
 */
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-lg space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose light, dark, or system color mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField label="Color mode" htmlFor="theme-select">
              <Select
                value={theme}
                onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
              >
                <SelectTrigger id="theme-select">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {user && (
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                {user.salesperson.full_name} · {user.role}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={logout}>
                Sign out
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
