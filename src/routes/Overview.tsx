import type { AnalysisResult, ThreatClass, WindowState } from '@/types/domain';
import { rankedFindings } from '@/state/selectors';
import { useStore } from '@/state/store';
import type { ViewId } from '@/state/views';
import { ReadinessHero } from '@/components/dashboard/ReadinessHero';
import { DeadlineLedger } from '@/components/dashboard/DeadlineLedger';
import { PriorityQueue } from '@/components/dashboard/PriorityQueue';
import { ThreatMatrix } from '@/components/analysis/ThreatMatrix';
import { Button, SectionHead } from '@/components/shared/Primitives';
import { HatchKey } from '@/components/shared/Hatch';

/* ============================================================================
   OVERVIEW  /  100

   Four questions in reading order: which deadline is closest, what is the
   overall state, what do I fix first, and how much of this did we actually
   assess. The last one is answered twice — in the readiness figures and again
   in the core-recovery bar — because it is the one a reader most wants to skip.

   The ledger leads rather than the timeline. The timeline plots when work must
   START, which is the right axis for planning and the wrong one for arriving:
   the first thing a reader wants on opening is the date they are held to and
   how much of the estate hangs off it. The column itself lives at 400, one
   click away, and this page does not repeat it.
   ========================================================================= */

export function Overview({
  analysis,
  onSelect,
  onNavigate,
  selectedId,
}: {
  analysis: AnalysisResult;
  onSelect: (id: string) => void;
  onNavigate: (view: ViewId) => void;
  selectedId: string | null;
}) {
  const { dispatch } = useStore();
  const ranked = rankedFindings(analysis);

  const drill = (kind: 'critical' | 'high' | 'unknown' | 'coverage') => {
    if (kind === 'coverage') {
      onNavigate('coverage');
      return;
    }
    dispatch({ type: 'filters/reset' });
    dispatch(
      kind === 'unknown'
        ? { type: 'filters', patch: { onlyUnknown: true } }
        : { type: 'filters', patch: { severities: [kind] } },
    );
    onNavigate('inventory');
  };

  const filterMatrix = (threatClass: ThreatClass | null, windowState: WindowState | null) => {
    dispatch({ type: 'filters/reset' });
    if (threatClass) dispatch({ type: 'filters', patch: { threatClasses: [threatClass] } });
    if (windowState === 'unknown') dispatch({ type: 'filters', patch: { onlyUnknown: true } });
    onNavigate('inventory');
  };

  return (
    <div className="pb-10">
      <section aria-labelledby="ledger-head" className="border-b border-rule">
        <div className="px-4 pt-5 lg:px-6">
          <SectionHead
            id="ledger-head"
            title="DEADLINE LEDGER"
            meta="the published obligations this estate is measured against"
            actions={
              <div className="flex items-center gap-4">
                <HatchKey />
                <Button size="sm" variant="quiet" onClick={() => onNavigate('timeline')}>
                  Open timeline
                </Button>
              </div>
            }
          />
        </div>
        <div className="mt-3">
          <DeadlineLedger
            analysis={analysis}
            onSelectDeadline={(year) => {
              dispatch({ type: 'filters/reset' });
              dispatch({ type: 'filters', patch: { deadlineYears: [year] } });
              onNavigate('inventory');
            }}
          />
        </div>
      </section>

      <ReadinessHero analysis={analysis} onDrill={drill} />

      <section aria-labelledby="queue-head" className="border-b border-rule">
        <div className="px-4 pt-5 lg:px-6">
          <SectionHead
            id="queue-head"
            title="WHAT TO MIGRATE FIRST"
            meta={`${ranked.length} findings ranked, ${analysis.coverage.unknown} unrankable`}
            actions={
              <Button size="sm" variant="quiet" onClick={() => onNavigate('triage')}>
                Full queue
              </Button>
            }
          />
        </div>
        <div className="mt-1">
          <PriorityQueue
            findings={ranked.slice(0, 8)}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        </div>
      </section>

      {/* Full width: the rightmost column is key establishment, and it is the
          column the reader most needs. Squeezing the matrix beside the queue
          pushed it off the edge of the panel. */}
      <section aria-labelledby="matrix-head" className="border-b border-rule px-4 py-5 lg:px-6">
        <SectionHead
          id="matrix-head"
          title="THREAT MATRIX"
          meta="attack feasibility across, migration urgency down"
        />
        <div className="mt-3">
          <ThreatMatrix findings={analysis.findings} onSelectCell={filterMatrix} />
        </div>
      </section>
    </div>
  );
}
