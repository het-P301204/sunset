import type { AnalysisResult } from '@/types/domain';
import { groupByDeadline } from '@/state/selectors';
import { SunsetTimeline } from '@/components/dashboard/SunsetTimeline';
import { SectionHead } from '@/components/shared/Primitives';
import { HatchKey, SeverityMark } from '@/components/shared/Hatch';

/* ============================================================================
   TIMELINE  /  400

   The full column, plus the instruments it is ruled against. Every deadline
   here quotes the clause that creates it and the document it comes from,
   because the whole product hangs off five dates and a reader is entitled to
   check them.
   ========================================================================= */

export function Timeline({
  analysis,
  onSelect,
  selectedId,
}: {
  analysis: AnalysisResult;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const groups = groupByDeadline(analysis.findings);

  return (
    <div className="pb-10">
      <section className="border-b border-rule px-4 py-5 lg:px-6">
        <SectionHead
          title="MIGRATION COLUMN"
          meta={`${analysis.findings.length} cryptographic uses · CRQC assumed ${analysis.assumptions.crqcYear}`}
          actions={<HatchKey />}
        />
        <div className="mt-4">
          <SunsetTimeline analysis={analysis} onSelect={onSelect} selectedId={selectedId} />
        </div>
        <p className="mt-4 text-sm leading-[19px] text-ink-muted measure">
          A finding sits at the year its migration has to begin, not the year it is due. Hollow
          marks have no effort estimate, so their start year is unknown and they are drawn at the
          deadline itself. The banded interval at the foot is everything with no position on this
          axis at all.
        </p>
      </section>

      <section className="border-b border-rule px-4 py-5 lg:px-6">
        <SectionHead title="MARKER HORIZONS" meta="the published instruments this is ruled against" />
        <ol className="mt-3 divide-y divide-rule-faint border-y border-rule-faint">
          {analysis.deadlines.map((deadline) => {
            const group = groups.find((g) => g.id === deadline.id);
            const milestone = deadline.effect === 'milestone';
            return (
              <li
                key={deadline.id}
                className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-5 py-3 lg:grid-cols-[4rem_minmax(0,1fr)_9rem]"
              >
                <span
                  className={`t-data text-xl font-light leading-none ${milestone ? 'text-ink-faint' : 'text-amber'}`}
                >
                  {deadline.year}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="t-section text-ink">{deadline.label}</span>
                    <span className="t-data text-2xs uppercase tracking-[0.08em] text-ink-muted">
                      {deadline.effect}
                    </span>
                  </span>
                  <p className="mt-1 text-sm leading-[18px] text-ink-dim measure">
                    {deadline.clause}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">{deadline.citation}</p>
                </span>
                <span className="col-start-2 mt-2 lg:col-start-3 lg:mt-0 lg:text-right">
                  {milestone ? (
                    <span className="text-xs text-ink-faint">binds a publisher, not an asset</span>
                  ) : group ? (
                    <span className="flex flex-col gap-1 lg:items-end">
                      <span className="t-data text-md text-ink">{group.findings.length}</span>
                      <span className="flex items-center gap-2">
                        {group.critical > 0 ? (
                          <span className="flex items-center gap-1 t-data text-2xs text-risk-critical">
                            <SeverityMark severity="critical" size={7} />
                            {group.critical}
                          </span>
                        ) : null}
                        {group.high > 0 ? (
                          <span className="flex items-center gap-1 t-data text-2xs text-risk-high">
                            <SeverityMark severity="high" size={7} />
                            {group.high}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-faint">nothing governed by this</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="px-4 py-5 lg:px-6">
        <SectionHead title="WHY SOME CLASSES HAVE NO DEADLINE" />
        <p className="mt-3 text-sm leading-[19px] text-ink-muted measure">
          Neither EO 14412 nor NIST IR 8547 sets a post-quantum migration date for symmetric
          ciphers or hashes. Grover reduces their margin rather than breaking them, and recorded
          material does not become readable later. SUNSET anchors those findings to no deadline and
          says so, rather than inventing an obligation no instrument creates. Where they do appear
          high in the queue it is because they are already broken classically, and that is stated
          on the finding.
        </p>
      </section>
    </div>
  );
}
