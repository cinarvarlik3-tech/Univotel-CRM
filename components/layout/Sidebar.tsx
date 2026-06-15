/**
 * Always-open labeled sidebar with grouped sections (§5.1 / D24).
 * Default: expanded with labels. Collapse is opt-in.
 * Sections: Günüm (+ Görevler) / Pipeline (Aktif satış → Kapanış → Özel durumlar) /
 *           Yönetim (manager-only) / Ayarlar. Calendars live inside pipeline groups.
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  IconAlertTriangle,
  IconArchive,
  IconBuilding,
  IconCalendar,
  IconCalendarEvent,
  IconChartBar,
  IconCheckbox,
  IconChevronLeft,
  IconChevronRight,
  IconContract,
  IconCurrencyLira,
  IconFileCheck,
  IconHistory,
  IconInbox,
  IconLayoutDashboard,
  IconPhoneCall,
  IconPhonePause,
  IconPlant2,
  IconSettings,
  IconTruck,
  IconUserCheck,
  IconUsers,
  IconWebhook,
  IconPhone,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRoleLabel } from '@/lib/i18n/enum-labels';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { UnivotelLogoWhite } from '@/components/layout/UnivotelLogo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
  managerOnly?: boolean;
}

interface SidebarProps {
  userName: string;
  userRole: string;
  isManager: boolean;
  isSuperadminUser: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Renders the labeled grouped sidebar navigation.
 */
export function Sidebar({
  userName,
  userRole,
  isManager,
  isSuperadminUser,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isOpen = !collapsed;

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

  // Nav groups per D24 spec
  const navGroups: NavGroup[] = [
    {
      items: [
        { href: '/my-day', label: t('nav.myDay'), icon: IconLayoutDashboard },
        { href: '/tasks', label: t('nav.tasks'), icon: IconCheckbox },
      ],
    },
    {
      label: 'AKTİF SATIŞ',
      items: [
        ...(isManager ? [{ href: '/leads', label: t('nav.leads'), icon: IconUsers }] : []),
        { href: '/leads/hub', label: t('nav.leadHub'), icon: IconInbox },
        { href: '/leads/mine', label: t('nav.myLeads'), icon: IconUserCheck },
        { href: '/leads/expecting-call', label: t('nav.expectingCall'), icon: IconPhoneCall },
        { href: '/leads/nurture', label: t('nav.nurture'), icon: IconPlant2 },
        { href: '/visits', label: t('nav.visitCalendar'), icon: IconCalendar },
        { href: '/leads/post-visit', label: t('nav.postVisit'), icon: IconFileCheck },
      ],
    },
    {
      label: 'KAPANIS',
      items: [
        { href: '/leads/downpayment', label: t('nav.downpayment'), icon: IconCurrencyLira },
        { href: '/move-in', label: t('nav.moveInCalendar'), icon: IconCalendarEvent },
        { href: '/leads/deal-signed', label: t('nav.dealSigned'), icon: IconContract },
        { href: '/leads/moved-in', label: t('nav.movedIn'), icon: IconTruck },
      ],
    },
    {
      label: 'ÖZEL DURUMLAR',
      items: [
        { href: '/leads/24h-restricted', label: t('nav.restricted24h'), icon: IconAlertTriangle },
        { href: '/deal-awaiting', label: t('nav.dealAwaiting'), icon: IconPhonePause },
      ],
    },
    {
      label: 'YÖNETİM',
      managerOnly: true,
      items: [
        { href: '/dashboard', label: t('nav.analytics'), icon: IconChartBar },
        { href: '/properties', label: t('nav.properties'), icon: IconBuilding },
        { href: '/webhook-logs', label: t('nav.webhookLogs'), icon: IconWebhook },
        { href: '/leads/archived', label: t('nav.archive'), icon: IconArchive },
        { href: '/old-leads', label: t('nav.oldLeads'), icon: IconHistory },
        ...(isSuperadminUser
          ? [{ href: '/admin/dni-numbers', label: t('nav.dniNumbers'), icon: IconPhone }]
          : []),
      ],
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 lg:hidden motion-reduce:transition-none',
          !collapsed ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onToggleCollapse}
        aria-hidden={collapsed}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full flex-col bg-surface-sidebar transition-[width] duration-200 ease-in-out motion-reduce:transition-none',
          isOpen ? 'w-[220px]' : 'w-[60px]',
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex h-[52px] items-center',
            isOpen ? 'justify-between px-3.5' : 'justify-center px-0',
          )}
        >
          {isOpen && (
            <div className="flex items-center gap-2">
              <UnivotelLogoWhite size={28} />
            </div>
          )}
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-text)] hover:bg-[var(--sidebar-icon-hover-bg)]"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Menüyü aç' : 'Menüyü daralt'}
          >
            {isOpen ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
          </button>
        </div>

        <Separator className="bg-[var(--sidebar-icon-hover-bg)]" />

        {/* Nav groups */}
        <nav
          className={cn(
            'flex flex-1 flex-col gap-0 overflow-y-auto py-2',
            isOpen ? 'px-2' : 'px-1.5',
          )}
        >
          {navGroups
            .filter((group) => !group.managerOnly || isManager)
            .map((group, gi) => (
              <div key={gi} className="mb-1">
                {/* Group label */}
                {group.label && isOpen && (
                  <p className="mb-0.5 mt-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-icon-idle)] opacity-60">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex h-9 items-center rounded-lg text-[13px] font-medium transition-colors',
                        isOpen ? 'gap-2.5 px-2' : 'justify-center px-0',
                        active
                          ? 'bg-[var(--sidebar-icon-active-bg)] text-[var(--sidebar-text)]'
                          : 'text-[var(--sidebar-icon-idle)] hover:bg-[var(--sidebar-icon-hover-bg)] hover:text-[var(--sidebar-text)]',
                      )}
                      title={!isOpen ? item.label : undefined}
                    >
                      <Icon size={18} className="shrink-0" />
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
        </nav>

        {/* Bottom: settings + user info */}
        <div className={cn('mt-auto pb-3', isOpen ? 'px-2' : 'px-1.5')}>
          <Separator className="mb-2 bg-[var(--sidebar-icon-hover-bg)]" />
          <Link
            href="/settings"
            className={cn(
              'flex h-9 items-center rounded-lg text-[13px] font-medium transition-colors',
              isOpen ? 'gap-2.5 px-2' : 'justify-center px-0',
              router.pathname.startsWith('/settings')
                ? 'bg-[var(--sidebar-icon-active-bg)] text-[var(--sidebar-text)]'
                : 'text-[var(--sidebar-icon-idle)] hover:bg-[var(--sidebar-icon-hover-bg)] hover:text-[var(--sidebar-text)]',
            )}
            title={!isOpen ? t('nav.settings') : undefined}
          >
            <IconSettings size={18} className="shrink-0" />
            {isOpen && <span className="truncate">{t('nav.settings')}</span>}
          </Link>

          {isOpen && (
            <div className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-[var(--sidebar-icon-hover-bg)] text-[10px] text-[var(--sidebar-text)]">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-[var(--sidebar-text)]">
                  {userName}
                </p>
                <p className="text-[10px] text-[var(--sidebar-icon-idle)]">
                  {formatRoleLabel(locale, userRole)}
                </p>
              </div>
            </div>
          )}
          {!isOpen && (
            <div className="mt-2 flex justify-center">
              <Avatar className="size-7">
                <AvatarFallback className="bg-[var(--sidebar-icon-hover-bg)] text-[10px] text-[var(--sidebar-text)]">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
