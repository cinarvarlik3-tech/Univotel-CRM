import { MEDIAN_TIME_CHART_STAGES } from '@/lib/analytics/funnel-stage-chart-colors';

/** localStorage key for median-time-in-stage visible stages. */
export const MEDIAN_TIME_VISIBLE_STAGES_KEY = 'univotel-analytics-median-time-visible-stages';

const VALID_STAGE_SET = new Set<string>(MEDIAN_TIME_CHART_STAGES);

/** Default: all non-lost funnel stages visible. */
export function defaultMedianTimeVisibleStages(): Set<string> {
  return new Set(MEDIAN_TIME_CHART_STAGES);
}

/** Reads persisted visible stages; falls back to all stages when absent or invalid. */
export function readMedianTimeVisibleStages(): Set<string> {
  if (typeof window === 'undefined') return defaultMedianTimeVisibleStages();
  try {
    const raw = window.localStorage.getItem(MEDIAN_TIME_VISIBLE_STAGES_KEY);
    if (!raw) return defaultMedianTimeVisibleStages();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultMedianTimeVisibleStages();
    const filtered = parsed.filter(
      (s): s is string => typeof s === 'string' && VALID_STAGE_SET.has(s),
    );
    if (filtered.length === 0) return defaultMedianTimeVisibleStages();
    return new Set(filtered);
  } catch {
    return defaultMedianTimeVisibleStages();
  }
}

/** Persists visible stage selection. */
export function writeMedianTimeVisibleStages(stages: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    MEDIAN_TIME_VISIBLE_STAGES_KEY,
    JSON.stringify([...stages].filter((s) => VALID_STAGE_SET.has(s))),
  );
}
