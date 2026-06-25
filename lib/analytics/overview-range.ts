/**
 * Date-range resolution for the analytics overview dashboard.
 * Three-tier precedence: global → section → widget (higher tiers override lower).
 */
import { istanbulTodayBounds, istanbulWeekStart } from '@/lib/time/istanbul';

export type OverviewRangePreset = 'today' | 'this_week' | 'this_month' | 'all_time' | 'custom';

/** `off` = pass control to the next tier; otherwise a concrete range. */
export type OverviewRangeSelection =
  | { mode: 'off' }
  | { mode: 'preset'; preset: OverviewRangePreset }
  | { mode: 'custom'; from: string; to: string };

export interface OverviewDateRange {
  from: Date;
  to: Date;
}

const ALL_TIME_END = new Date('2099-12-31T23:59:59+03:00');

/** Default global filter — All Time passes control to section/widget tiers. */
export const DEFAULT_GLOBAL_RANGE: OverviewRangeSelection = {
  mode: 'preset',
  preset: 'all_time',
};

/** True when global filter overrides section/widget tiers (any preset except All Time). */
export function isGlobalRangeOverriding(global: OverviewRangeSelection): boolean {
  if (global.mode === 'off') return false;
  if (global.mode === 'preset' && global.preset === 'all_time') return false;
  return true;
}

/**
 * Resolves a range selection into concrete Istanbul-scoped UTC bounds.
 * @param selection - Preset, custom YYYY-MM-DD pair, or off (returns null).
 * @returns Date bounds or null when mode is off.
 */
export function resolveOverviewRangeSelection(
  selection: OverviewRangeSelection,
): OverviewDateRange | null {
  if (selection.mode === 'off') return null;

  const now = new Date();
  const { start: todayStart, end: todayEnd } = istanbulTodayBounds(now);

  if (selection.mode === 'preset') {
    switch (selection.preset) {
      case 'today':
        return { from: todayStart, to: todayEnd };
      case 'this_week':
        return { from: istanbulWeekStart(now), to: todayEnd };
      case 'this_month': {
        const monthStart = new Date(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
          }).format(now) + '-01T00:00:00+03:00',
        );
        return { from: monthStart, to: todayEnd };
      }
      case 'all_time':
        return { from: new Date(0), to: ALL_TIME_END };
      default:
        return { from: istanbulWeekStart(now), to: todayEnd };
    }
  }

  const from = new Date(`${selection.from}T00:00:00+03:00`);
  const to = new Date(`${selection.to}T23:59:59.999+03:00`);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return { from: todayStart, to: todayEnd };
  }
  return { from, to };
}

/**
 * Applies three-tier filter precedence for a ranged widget.
 * @param global - Tier-1 page filter.
 * @param section - Tier-2 section filter.
 * @param widget - Tier-3 widget filter (optional).
 * @param fallback - Used when every tier is off (default this_month).
 */
export function resolveEffectiveRange(
  global: OverviewRangeSelection,
  section: OverviewRangeSelection,
  widget?: OverviewRangeSelection,
  fallback: OverviewRangePreset = 'this_month',
): OverviewDateRange {
  if (isGlobalRangeOverriding(global)) {
    return resolveOverviewRangeSelection(global)!;
  }

  const sectionRange = resolveOverviewRangeSelection(section);
  if (sectionRange) return sectionRange;

  if (widget) {
    const widgetRange = resolveOverviewRangeSelection(widget);
    if (widgetRange) return widgetRange;
  }

  return resolveOverviewRangeSelection({ mode: 'preset', preset: fallback })!;
}

/** True when a higher tier is forcing this control inactive. */
export function isRangeOverridden(
  tier: 'section' | 'widget',
  global: OverviewRangeSelection,
  section: OverviewRangeSelection,
): boolean {
  if (isGlobalRangeOverriding(global)) return true;
  if (tier === 'widget' && section.mode !== 'off') return true;
  return false;
}

/**
 * Parses a range query param from the overview API.
 * Format: `off` | preset name | `custom:YYYY-MM-DD:YYYY-MM-DD`
 */
export function parseOverviewRangeParam(raw: string | undefined): OverviewRangeSelection {
  if (!raw || raw === 'off') return { mode: 'off' };
  if (raw.startsWith('custom:')) {
    const [, from, to] = raw.split(':');
    if (from && to) return { mode: 'custom', from, to };
  }
  const presets: OverviewRangePreset[] = ['today', 'this_week', 'this_month', 'all_time', 'custom'];
  if (presets.includes(raw as OverviewRangePreset)) {
    return { mode: 'preset', preset: raw as OverviewRangePreset };
  }
  return { mode: 'off' };
}

/** Serializes a range selection for query strings. */
export function serializeOverviewRangeParam(selection: OverviewRangeSelection): string {
  if (selection.mode === 'off') return 'off';
  if (selection.mode === 'custom') return `custom:${selection.from}:${selection.to}`;
  return selection.preset;
}
