import { useState } from 'react';
import type { AnalysisResult, EnforcementOutcome, SimulationResult } from '@/types/domain';
import { OUTCOME_LABEL } from '@/engine/simulate';
import { useStore } from '@/state/store';
import { PolicySimulator } from '@/components/simulation/PolicySimulator';
import { Modal } from '@/components/shared/Overlays';
import { SeverityMark } from '@/components/shared/Hatch';

/* ============================================================================
   SIMULATION  /  600
   ========================================================================= */

export function Simulation({
  analysis,
  onSelect,
}: {
  analysis: AnalysisResult;
  onSelect: (id: string) => void;
}) {
  const { state, dispatch } = useStore();
  const [inspecting, setInspecting] = useState<{
    outcome: EnforcementOutcome;
    result: SimulationResult;
  } | null>(null);

  const index = new Map(analysis.findings.map((f) => [f.id, f]));
  const rows = inspecting
    ? inspecting.result.decisions
        .filter((d) => d.outcome === inspecting.outcome)
        .map((d) => ({ decision: d, finding: index.get(d.findingId)! }))
        .filter((r) => r.finding)
    : [];

  return (
    <div className="pb-10">
      <PolicySimulator
        findings={analysis.findings}
        policy={state.policy}
        onPolicyChange={(policy) => dispatch({ type: 'policy', policy })}
        onInspect={(outcome, result) => setInspecting({ outcome, result })}
      />

      <Modal
        open={inspecting !== null}
        onClose={() => setInspecting(null)}
        title={inspecting ? `${OUTCOME_LABEL[inspecting.outcome]} — ${rows.length} assets` : ''}
        width="max-w-3xl"
      >
        <p className="mb-3 text-sm text-ink-muted measure">
          Each row gives the clause of the policy that produced the outcome. Nothing on this screen
          has been enforced.
        </p>
        <ul className="max-h-[52vh] divide-y divide-rule-faint overflow-y-auto border-y border-rule-faint">
          {rows.slice(0, 200).map(({ decision, finding }) => (
            <li key={decision.findingId}>
              <button
                type="button"
                onClick={() => {
                  onSelect(finding.id);
                  setInspecting(null);
                }}
                className="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-3 py-2 text-left transition-colors duration-fast hover:bg-bed-2"
              >
                <span className="pt-0.5">
                  <SeverityMark severity={finding.severity} size={8} />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className="truncate text-sm text-ink">{finding.asset.name}</span>
                    <span className="t-data text-xs text-ink-dim">{finding.asset.algorithm}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{decision.reason}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {rows.length > 200 ? (
          <p className="mt-2 text-xs text-ink-faint">
            Showing the first 200 of {rows.length}. The full set is in the JSON export.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
