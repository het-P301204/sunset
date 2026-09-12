import { useMemo } from 'react';
import type { AnalysisResult } from '@/types/domain';
import { PLAN_BUCKETS } from '@/types/domain';
import { buildPlanColumns } from '@/state/selectors';
import { useStore } from '@/state/store';
import { MigrationPlan } from '@/components/plan/MigrationPlan';

/* ============================================================================
   PLAN  /  700
   ========================================================================= */

export function Plan({
  analysis,
  onSelect,
}: {
  analysis: AnalysisResult;
  onSelect: (id: string) => void;
}) {
  const { state, dispatch } = useStore();
  const columns = useMemo(
    () => buildPlanColumns(analysis, state.plan, PLAN_BUCKETS),
    [analysis, state.plan],
  );

  return (
    <div className="pb-10">
      <MigrationPlan
        columns={columns}
        onSelect={onSelect}
        onOverride={(findingId, bucket, reason) =>
          dispatch({ type: 'plan/override', findingId, bucket, reason })
        }
        onWithdraw={(findingId) =>
          dispatch({ type: 'plan/override', findingId, bucket: null, reason: '' })
        }
      />
    </div>
  );
}
