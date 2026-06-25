/**
 * FMS app shell — swaps CRM sidebar for FMS-only navigation.
 */
import { useMemo, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { buildFmsNavGroups } from '@/components/finance/fms-nav';
import { FmsFilterProvider } from '@/components/finance/FmsFilterContext';
import { FmsIncludeKaporaToggle } from '@/components/finance/FmsIncludeKaporaToggle';
import { FmsSelectionProvider } from '@/components/finance/FmsSelectionContext';
import { useFmsTotals } from '@/hooks/useFms';
import { useTranslation } from '@/hooks/useTranslation';

interface FmsShellProps {
  children: ReactNode;
  title?: string;
  count?: number;
  actions?: ReactNode;
}

function FmsShellInner({ children, title, count, actions }: FmsShellProps) {
  const { t } = useTranslation();
  const { data: totals } = useFmsTotals();

  const navOverride = useMemo(() => buildFmsNavGroups(totals, t), [totals, t]);

  const headerActions = (
    <>
      <FmsIncludeKaporaToggle />
      {actions}
    </>
  );

  return (
    <AppShell
      title={title ?? t('fms.title')}
      count={count}
      actions={headerActions}
      navOverride={navOverride}
      shellVariant="fms"
    >
      {children}
    </AppShell>
  );
}

/**
 * Wraps FMS pages with manager-only access and dynamic partner/property nav.
 */
export function FmsShell(props: FmsShellProps) {
  return (
    <FmsFilterProvider>
      <FmsSelectionProvider>
        <FmsShellInner {...props} />
      </FmsSelectionProvider>
    </FmsFilterProvider>
  );
}
