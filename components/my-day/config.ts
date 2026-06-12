/**
 * My Day task container configuration — icons, accent colors, and copy per container.
 * Adapt Modernize/MatDash structure to Univotel navy/teal brand tokens.
 */
import {
  IconLeaf,
  IconPhoneCall,
  IconCalendarCheck,
  IconMessageDots,
  IconDoorEnter,
  IconHistory,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

export type ContainerKey =
  | 'nurtures'
  | 'calls'
  | 'visits'
  | 'postVisit'
  | 'moveIns'
  | 'recentCalls';

export interface ContainerConfig {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon chip background and icon color. */
  chip: string;
  emptyText: string;
  /** Optional deep-link href to the full stage compartment. */
  viewAllHref?: string;
}

export const CONTAINERS: Record<ContainerKey, ContainerConfig> = {
  nurtures: {
    title: 'Beslenecekler',
    subtitle: 'bugün iletişim kurulmadı',
    icon: IconLeaf,
    chip: 'bg-amber-500/10 text-amber-600',
    emptyText: 'Bugün beslenecek lead yok.',
    viewAllHref: '/leads/nurture',
  },
  calls: {
    title: 'Aranacaklar',
    icon: IconPhoneCall,
    chip: 'bg-teal-600/10 text-teal-700',
    emptyText: 'Bugün aranacak lead yok.',
    viewAllHref: '/leads/expecting-call',
  },
  visits: {
    title: 'Bugünkü Ziyaretler',
    icon: IconCalendarCheck,
    chip: 'bg-indigo-500/10 text-indigo-600',
    emptyText: 'Bugün ziyaret yok.',
    viewAllHref: '/visits',
  },
  postVisit: {
    title: 'Ziyaret Sonrası Takip',
    subtitle: 'bugün iletişim kurulmadı',
    icon: IconMessageDots,
    chip: 'bg-violet-500/10 text-violet-600',
    emptyText: 'Takip bekleyen ziyaret yok.',
    viewAllHref: '/leads/post-visit',
  },
  moveIns: {
    title: 'Bugün Taşınanlar',
    icon: IconDoorEnter,
    chip: 'bg-emerald-500/10 text-emerald-600',
    emptyText: 'Bugün taşınan yok.',
  },
  recentCalls: {
    title: 'Son Aramalar',
    icon: IconHistory,
    chip: 'bg-slate-500/10 text-slate-600',
    emptyText: 'Henüz arama yok.',
  },
};
