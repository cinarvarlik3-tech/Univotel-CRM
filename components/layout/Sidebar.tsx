/**
 * Collapsible sidebar navigation — overlay mode, brand blue background.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import {
  IconArchive,
  IconBuilding,
  IconCalendar,
  IconCalendarEvent,
  IconChartBar,
  IconCheckbox,
  IconClock,
  IconClockPause,
  IconContract,
  IconCurrencyLira,
  IconFileCheck,
  IconHistory,
  IconInbox,
  IconMenu2,
  IconPhoneCall,
  IconPlant2,
  IconSettings,
  IconSpeakerphone,
  IconUserCheck,
  IconUsers,
  IconPhone,
  IconWebhook,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRoleLabel } from '@/lib/i18n/enum-labels';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { UnivotelLogoWhite } from '@/components/layout/UnivotelLogo';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  managerOnly?: boolean;
  salespersonOnly?: boolean;
  superadminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/leads', labelKey: 'nav.leads', icon: IconUsers },
  { href: '/leads/mine', labelKey: 'nav.myLeads', icon: IconUserCheck },
  { href: '/leads/hub', labelKey: 'nav.leadHub', icon: IconInbox },
  { href: '/leads/expecting-call', labelKey: 'nav.expectingCall', icon: IconPhoneCall },
  { href: '/leads/nurture', labelKey: 'nav.nurture', icon: IconPlant2 },
  { href: '/visits', labelKey: 'nav.visitCalendar', icon: IconCalendar },
  { href: '/leads/post-visit', labelKey: 'nav.postVisit', icon: IconFileCheck },
  { href: '/leads/24h-restricted', labelKey: 'nav.restricted24h', icon: IconClock },
  { href: '/leads/downpayment', labelKey: 'nav.downpayment', icon: IconCurrencyLira },
  { href: '/leads/deal-signed', labelKey: 'nav.dealSigned', icon: IconContract },
  { href: '/move-in', labelKey: 'nav.moveInCalendar', icon: IconCalendarEvent },
  { href: '/leads/moved-in', labelKey: 'nav.movedIn', icon: IconBuilding },
  { href: '/deal-awaiting', labelKey: 'nav.dealAwaiting', icon: IconClockPause },
  { href: '/tasks', labelKey: 'nav.tasks', icon: IconCheckbox },
  { href: '/properties', labelKey: 'nav.properties', icon: IconBuilding },
  { href: '/dashboard', labelKey: 'nav.analytics', icon: IconChartBar, managerOnly: true },
  { href: '/campaigns', labelKey: 'nav.campaigns', icon: IconSpeakerphone, managerOnly: true },
  { href: '/webhook-logs', labelKey: 'nav.webhookLogs', icon: IconWebhook, managerOnly: true },
  { href: '/leads/archived', labelKey: 'nav.archive', icon: IconArchive, managerOnly: true },
  { href: '/old-leads', labelKey: 'nav.oldLeads', icon: IconHistory, managerOnly: true },
  { href: '/admin/dni-numbers', labelKey: 'nav.dniNumbers', icon: IconPhone, superadminOnly: true },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/settings', labelKey: 'nav.settings', icon: IconSettings },
];

interface SidebarProps {
  userName: string;
  userRole: string;
  isManager: boolean;
  isSuperadminUser: boolean;
}

/**
 * Returns initials from a full name string.
 * @param name - User display name.
 * @returns Up to two uppercase initials.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Renders collapsible sidebar with icon navigation.
 * @param props - User info and role flags.
 * @returns Sidebar element.
 */
export function Sidebar({ userName, userRole, isManager, isSuperadminUser }: SidebarProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);

  const isOpen = expanded || pinned;
  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.superadminOnly && !isSuperadminUser) return false;
    if (item.managerOnly && !isManager) return false;
    if (item.salespersonOnly && isManager) return false;
    return true;
  });

  const EXACT_LEADS_SUBPAGES = new Set([
    '/leads/mine',
    '/leads/hub',
    '/leads/expecting-call',
    '/leads/nurture',
    '/leads/post-visit',
    '/leads/24h-restricted',
    '/leads/downpayment',
    '/leads/deal-signed',
    '/leads/moved-in',
    '/leads/archived',
    '/leads/new',
  ]);

  function isActive(href: string) {
    if (href === '/old-leads') return router.pathname.startsWith('/old-leads');
    if (href === '/deal-awaiting') return router.pathname.startsWith('/deal-awaiting');
    if (href === '/visits') return router.pathname === '/visits';
    if (href === '/move-in') return router.pathname === '/move-in';
    // Exact-match subroutes under /leads.
    if (EXACT_LEADS_SUBPAGES.has(href)) return router.pathname === href;
    if (href === '/leads') {
      return (
        router.pathname === '/leads' ||
        (router.pathname.startsWith('/leads/') &&
          !EXACT_LEADS_SUBPAGES.has(router.pathname) &&
          router.pathname !== '/leads/new')
      );
    }
    return router.pathname.startsWith(href);
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/20 transition-opacity duration-300 ease-in-out lg:hidden motion-reduce:transition-none',
          isOpen && pinned ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setPinned(false)}
        aria-hidden={!(isOpen && pinned)}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full flex-col bg-surface-sidebar transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
          isOpen ? 'w-[220px]' : 'w-[60px]',
        )}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => {
          if (!pinned) setExpanded(false);
        }}
      >
        <div
          className={cn(
            'flex h-[52px] items-center gap-2',
            isOpen ? 'px-3.5' : 'justify-center px-0',
          )}
        >
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-text)] hover:bg-[var(--sidebar-icon-hover-bg)]"
            onClick={() => setPinned((p) => !p)}
            aria-label={t('nav.toggleSidebar')}
          >
            <IconMenu2 size={20} className="opacity-80" />
          </button>
          <div
            className={cn(
              'overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out motion-reduce:transition-none',
              isOpen ? 'max-w-[32px] opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            <UnivotelLogoWhite size={32} />
          </div>
        </div>

        <Separator className="bg-[var(--sidebar-icon-hover-bg)]" />

        <nav className={cn('flex flex-1 flex-col gap-0.5 py-3', isOpen ? 'px-2' : 'px-0')}>
          {visibleNav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-10 items-center rounded-lg text-[13px] font-medium transition-colors',
                  isOpen ? 'gap-3 px-2.5' : 'justify-center px-0',
                  active
                    ? 'bg-[var(--sidebar-icon-active-bg)] text-[var(--sidebar-text)]'
                    : 'text-[var(--sidebar-icon-idle)] hover:bg-[var(--sidebar-icon-hover-bg)] hover:text-[var(--sidebar-text)]',
                )}
              >
                <Icon size={20} className="shrink-0" />
                <span
                  className={cn(
                    'truncate transition-[opacity,max-width] duration-300 ease-in-out motion-reduce:transition-none',
                    isOpen ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className={cn('mt-auto pb-3', isOpen ? 'px-2' : 'px-0')}>
          <Separator className="mb-2 bg-[var(--sidebar-icon-hover-bg)]" />
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = router.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-10 items-center rounded-lg text-[13px] font-medium transition-colors',
                  isOpen ? 'gap-3 px-2.5' : 'justify-center px-0',
                  active
                    ? 'bg-[var(--sidebar-icon-active-bg)] text-[var(--sidebar-text)]'
                    : 'text-[var(--sidebar-icon-idle)] hover:bg-[var(--sidebar-icon-hover-bg)] hover:text-[var(--sidebar-text)]',
                )}
              >
                <Icon size={20} className="shrink-0" />
                <span
                  className={cn(
                    'truncate transition-[opacity,max-width] duration-300 ease-in-out motion-reduce:transition-none',
                    isOpen ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}

          <div
            className={cn(
              'mt-2 flex items-center py-1.5',
              isOpen ? 'gap-2.5 px-2.5' : 'justify-center px-0',
            )}
          >
            <Avatar>
              <AvatarFallback className="bg-[var(--sidebar-icon-active-bg)] text-[var(--sidebar-text)]">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'min-w-0 overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out motion-reduce:transition-none',
                isOpen ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0',
              )}
            >
              <p className="truncate text-xs font-medium text-[var(--sidebar-text)]">{userName}</p>
              <p className="truncate text-[11px] capitalize text-[var(--sidebar-icon-idle)]">
                {formatRoleLabel(locale, userRole)}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
