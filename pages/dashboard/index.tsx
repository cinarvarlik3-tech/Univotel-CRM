/**
 * Manager analytics dashboard page — Everyday / Marketing / Loss Analysis / Salesperson.
 */
import { useCallback, useEffect, useState } from 'react';
import { AnalyticsGlobalHeaderControls } from '@/components/analytics/overview/AnalyticsGlobalHeaderControls';
import { AppShell } from '@/components/layout/AppShell';
import {
  AnalyticsTabsShell,
  type AnalyticsTabId,
} from '@/components/analytics/overview/AnalyticsTabsShell';
import { SalespersonShell } from '@/components/analytics/salesperson/SalespersonShell';
import { SalespersonHeaderControls } from '@/components/analytics/salesperson/SalespersonHeaderControls';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useSalespersonLeaderboard } from '@/hooks/useSalespersonLeaderboard';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_ANALYTICS_FILTERS, type AnalyticsFilterState } from '@/hooks/useAnalyticsTabs';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { readCalcNotesEnabled, writeCalcNotesEnabled } from '@/lib/analytics/calc-notes-storage';
import type { OverviewRangeSelection } from '@/lib/analytics/overview-range';
import type { LeaderboardSortKey } from '@/lib/analytics/salesperson-leaderboard';

type DashboardTabId = AnalyticsTabId | 'salesperson';

const DEFAULT_SP_RANGE: OverviewRangeSelection = { mode: 'preset', preset: 'this_month' };

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const isManager = isManagerOrAbove(user?.role);
  const [activeTab, setActiveTab] = useState<DashboardTabId>('everyday');
  const [filters, setFilters] = useState<AnalyticsFilterState>(DEFAULT_ANALYTICS_FILTERS);
  const [showCalcNotes, setShowCalcNotes] = useState(true);

  // Salesperson-tab state (lifted here so its controls can live in the AppShell header)
  const [spSelectedRepId, setSpSelectedRepId] = useState<string | null>(null);
  const [spRange, setSpRange] = useState<OverviewRangeSelection>(DEFAULT_SP_RANGE);
  const [spIncludeKapora, setSpIncludeKapora] = useState(false);
  const [spSort, setSpSort] = useState<LeaderboardSortKey>('revenue');

  useEffect(() => {
    setShowCalcNotes(readCalcNotesEnabled());
  }, []);

  const patchFilters = useCallback((partial: Partial<AnalyticsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleCalcNotesChange = useCallback((next: boolean) => {
    setShowCalcNotes(next);
    writeCalcNotesEnabled(next);
  }, []);

  const isSalespersonTab = isManager && activeTab === 'salesperson';

  // Leaderboard data (provides rep list for the header picker + leaderboard view)
  const {
    data: leaderboard,
    isLoading: lbLoading,
    error: lbError,
  } = useSalespersonLeaderboard(isSalespersonTab, spRange, spSort, spIncludeKapora);

  const spReps =
    leaderboard?.rows.map((r) => ({
      id: r.salespersonId,
      fullName: r.fullName,
      isActive: r.isActive,
    })) ?? [];

  // Global filter only shown on the three analytics tabs (not salesperson — it has its own)
  const showGlobalFilter = isManager && activeTab !== 'salesperson';

  if (authLoading) {
    return (
      <AppShell title={t('analytics.title')}>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTabId)}>
      <AppShell
        title={t('analytics.title')}
        actions={
          isSalespersonTab ? (
            <SalespersonHeaderControls
              reps={spReps}
              selectedRepId={spSelectedRepId}
              onSelectRep={setSpSelectedRepId}
              range={spRange}
              onRangeChange={setSpRange}
              defaultRange={DEFAULT_SP_RANGE}
              includeKapora={spIncludeKapora}
              onKaporaChange={setSpIncludeKapora}
              showCalcNotes={showCalcNotes}
              onCalcNotesChange={handleCalcNotesChange}
              showBack={spSelectedRepId !== null}
              onBack={() => setSpSelectedRepId(null)}
            />
          ) : showGlobalFilter ? (
            <AnalyticsGlobalHeaderControls
              global={filters.global}
              onGlobalChange={(global) => patchFilters({ global })}
              showCalcNotes={showCalcNotes}
              onShowCalcNotesChange={handleCalcNotesChange}
            />
          ) : undefined
        }
        subheader={
          isManager ? (
            <TabsList className="h-8 gap-5 border-b-0">
              <TabsTrigger value="everyday">{t('analytics.tabEveryday')}</TabsTrigger>
              <TabsTrigger value="marketing">{t('analytics.tabMarketing')}</TabsTrigger>
              <TabsTrigger value="loss">{t('analytics.tabLossAnalysis')}</TabsTrigger>
              <TabsTrigger value="salesperson">{t('analytics.tabSalesperson')}</TabsTrigger>
            </TabsList>
          ) : undefined
        }
      >
        {!isManager && <p className="text-sm text-brand-red">{t('analytics.managerOnly')}</p>}

        {isManager && (
          <>
            <TabsContent value="everyday" className="mt-0">
              {activeTab === 'everyday' && (
                <AnalyticsTabsShell
                  activeTab="everyday"
                  filters={filters}
                  onPatch={patchFilters}
                  showCalcNotes={showCalcNotes}
                />
              )}
            </TabsContent>

            <TabsContent value="marketing" className="mt-0">
              {activeTab === 'marketing' && (
                <AnalyticsTabsShell
                  activeTab="marketing"
                  filters={filters}
                  onPatch={patchFilters}
                  showCalcNotes={showCalcNotes}
                />
              )}
            </TabsContent>

            <TabsContent value="loss" className="mt-0">
              {activeTab === 'loss' && (
                <AnalyticsTabsShell
                  activeTab="loss"
                  filters={filters}
                  onPatch={patchFilters}
                  showCalcNotes={showCalcNotes}
                />
              )}
            </TabsContent>

            <TabsContent value="salesperson" className="mt-0">
              {activeTab === 'salesperson' && (
                <SalespersonShell
                  selectedRepId={spSelectedRepId}
                  onSelectRep={setSpSelectedRepId}
                  range={spRange}
                  includeKapora={spIncludeKapora}
                  showCalcNotes={showCalcNotes}
                  leaderboard={leaderboard}
                  leaderboardLoading={lbLoading}
                  leaderboardError={Boolean(lbError)}
                  leaderboardSort={spSort}
                  onSortChange={setSpSort}
                />
              )}
            </TabsContent>
          </>
        )}
      </AppShell>
    </Tabs>
  );
}
