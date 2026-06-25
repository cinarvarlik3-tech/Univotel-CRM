import { FUNNEL_STATUSES } from '@/lib/constants';

/** Funnel stages shown in the median-time-in-stage chart (excludes lost). */
export const MEDIAN_TIME_CHART_STAGES = FUNNEL_STATUSES.filter((s) => s !== 'lost');

const UNIVOTEL_BLUES = new Set(['#2e3fa3', '#6b7fe3', '#4f46e5', '#3b82f6', '#2563eb']);

/**
 * Distinct bar colors per funnel stage — intentionally excludes Univotel brand blue.
 * Order follows MEDIAN_TIME_CHART_STAGES.
 */
const STAGE_BAR_COLORS: Record<(typeof MEDIAN_TIME_CHART_STAGES)[number], string> = {
  yeni: '#b83228',
  'bilgi-verildi': '#0e7490',
  aranacak: '#6d28d9',
  arandi: '#b06000',
  'arandi-acmadi': '#1b6b2f',
  'bizi-aradi-konustuk': '#e05a4e',
  ziyaret: '#0891b2',
  'ziyaret-etmedi': '#ca8a04',
  'ziyaret-etti': '#7c3aed',
  'teklif-gonderildi': '#be185d',
  'kapora-alindi': '#059669',
  'sozlesme-imzalandi': '#a21caf',
};

if (process.env.NODE_ENV !== 'production') {
  for (const color of Object.values(STAGE_BAR_COLORS)) {
    if (UNIVOTEL_BLUES.has(color.toLowerCase())) {
      throw new Error(`Median time stage color must not use Univotel blue: ${color}`);
    }
  }
}

/** Returns the bar fill color for a funnel stage in analytics charts. */
export function getFunnelStageChartColor(stage: string): string {
  return STAGE_BAR_COLORS[stage as keyof typeof STAGE_BAR_COLORS] ?? '#64748b';
}
