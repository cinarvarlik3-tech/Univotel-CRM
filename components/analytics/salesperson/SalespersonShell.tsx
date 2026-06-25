/**
 * Salesperson analytics shell — orchestrates leaderboard ↔ rep-detail views.
 * Rendered as the "Salesperson" tab on /dashboard (manager/superadmin only).
 *
 * View state:
 *   selectedRepId = null  → Leaderboard view
 *   selectedRepId = uuid  → Rep detail view
 *
 * Header controls (rep picker, date range, kapora/calc-notes toggles, back-to-leaderboard)
 * live in the page-level AppShell actions slot — see SalespersonHeaderControls / dashboard page.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import type { OverviewRangeSelection } from '@/lib/analytics/overview-range';
import type {
  LeaderboardSortKey,
  SalespersonLeaderboardPayload,
} from '@/lib/analytics/salesperson-leaderboard';
import { useSalespersonAnalytics } from '@/hooks/useSalespersonAnalytics';
import { RepContextStrip } from './RepContextStrip';
import { GlobalSection } from './GlobalSection';
import { VisitsSection } from './VisitsSection';
import { DealsSection } from './DealsSection';
import { LossRiskSection } from './LossRiskSection';
import { SpeedSection } from './SpeedSection';
import { Leaderboard } from './Leaderboard';

interface SalespersonShellProps {
  selectedRepId: string | null;
  onSelectRep: (id: string | null) => void;
  range: OverviewRangeSelection;
  includeKapora: boolean;
  showCalcNotes: boolean;
  leaderboard: SalespersonLeaderboardPayload | undefined;
  leaderboardLoading: boolean;
  leaderboardError: boolean;
  leaderboardSort: LeaderboardSortKey;
  onSortChange: (sort: LeaderboardSortKey) => void;
}

export function SalespersonShell({
  selectedRepId,
  onSelectRep,
  range,
  includeKapora,
  showCalcNotes,
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  leaderboardSort,
  onSortChange,
}: SalespersonShellProps) {
  const { t } = useTranslation();

  // Rep detail data (only fetched when a rep is selected)
  const {
    data: repData,
    isLoading: repLoading,
    error: repError,
  } = useSalespersonAnalytics(selectedRepId, range, includeKapora);

  const showDetailView = selectedRepId !== null;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      {/* Error state */}
      {(leaderboardError || repError) && (
        <p className="text-sm text-brand-red">{t('analytics.spFailedToLoad')}</p>
      )}

      {/* ── LEADERBOARD VIEW ──────────────────────────────────────────────── */}
      {!showDetailView && (
        <>
          {leaderboardLoading && !leaderboard && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {leaderboard && (
            <Leaderboard
              rows={leaderboard.rows}
              teamTotals={leaderboard.teamTotals}
              onSelectRep={(id) => onSelectRep(id)}
              sort={leaderboardSort}
              onSortChange={onSortChange}
            />
          )}
        </>
      )}

      {/* ── DETAIL VIEW ───────────────────────────────────────────────────── */}
      {showDetailView && (
        <>
          {repLoading && !repData && (
            <div className="space-y-6">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
            </div>
          )}

          {repData && (
            <>
              <RepContextStrip rep={repData.rep} />
              <GlobalSection data={repData.global} showCalcNotes={showCalcNotes} />
              <VisitsSection data={repData.visits} showCalcNotes={showCalcNotes} />
              <DealsSection data={repData.deals} showCalcNotes={showCalcNotes} />
              <LossRiskSection data={repData.lossRisk} showCalcNotes={showCalcNotes} />
              <SpeedSection data={repData.speed} showCalcNotes={showCalcNotes} />
            </>
          )}
        </>
      )}
    </div>
  );
}
