/**
 * Analytics tabs shell — lazy tab content with shared filter state from parent.
 */
import { EverydayTab } from '@/components/analytics/overview/EverydayTab';
import { LossAnalysisTab } from '@/components/analytics/overview/LossAnalysisTab';
import { MarketingTab } from '@/components/analytics/overview/MarketingTab';
import type { AnalyticsFilterState } from '@/hooks/useAnalyticsTabs';

export type AnalyticsTabId = 'everyday' | 'marketing' | 'loss';

interface AnalyticsTabsShellProps {
  activeTab: AnalyticsTabId;
  filters: AnalyticsFilterState;
  onPatch: (partial: Partial<AnalyticsFilterState>) => void;
  showCalcNotes: boolean;
}

export function AnalyticsTabsShell({
  activeTab,
  filters,
  onPatch,
  showCalcNotes,
}: AnalyticsTabsShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      {activeTab === 'everyday' && (
        <EverydayTab enabled filters={filters} onPatch={onPatch} showCalcNotes={showCalcNotes} />
      )}
      {activeTab === 'marketing' && (
        <MarketingTab enabled filters={filters} onPatch={onPatch} showCalcNotes={showCalcNotes} />
      )}
      {activeTab === 'loss' && (
        <LossAnalysisTab
          enabled
          filters={filters}
          onPatch={onPatch}
          showCalcNotes={showCalcNotes}
        />
      )}
    </div>
  );
}
