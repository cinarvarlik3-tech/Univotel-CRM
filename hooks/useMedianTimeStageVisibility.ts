import { useCallback, useEffect, useState } from 'react';
import { MEDIAN_TIME_CHART_STAGES } from '@/lib/analytics/funnel-stage-chart-colors';
import {
  readMedianTimeVisibleStages,
  writeMedianTimeVisibleStages,
} from '@/lib/analytics/median-time-stage-storage';

/** Client-side visible-stage selection for the median-time-in-stage chart. */
export function useMedianTimeStageVisibility() {
  const [visibleStages, setVisibleStages] = useState<Set<string>>(() =>
    readMedianTimeVisibleStages(),
  );

  useEffect(() => {
    setVisibleStages(readMedianTimeVisibleStages());
  }, []);

  useEffect(() => {
    writeMedianTimeVisibleStages(visibleStages);
  }, [visibleStages]);

  const toggleStage = useCallback((stage: string) => {
    setVisibleStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        if (next.size <= 1) return prev;
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  }, []);

  const isStageVisible = useCallback((stage: string) => visibleStages.has(stage), [visibleStages]);

  const orderedVisibleStages = MEDIAN_TIME_CHART_STAGES.filter((s) => visibleStages.has(s));

  return {
    visibleStages,
    orderedVisibleStages,
    toggleStage,
    isStageVisible,
  };
}
