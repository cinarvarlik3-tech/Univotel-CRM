/**
 * Shared sidebar navigation types for CRM and feature shells (FMS, etc.).
 */
import type { ComponentType } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  /** Nested links rendered indented under this item (FMS property drill-down). */
  subItems?: NavItem[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
  managerOnly?: boolean;
}
