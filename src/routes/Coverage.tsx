import type { AnalysisResult, GapReason } from '@/types/domain';
import { useStore } from '@/state/store';
import type { ViewId } from '@/state/views';
import { CoverageRing, UnknownBreakdown } from '@/components/coverage/CoverageOverview';
import { AgilityDistribution } from '@/components/analysis/CryptoAgility';
import { SectionHead } from '@/components/shared/Primitives';

/* ============================================================================
   COVERAGE  /  500

   The most important screen in the product, and the one most tools do not have.

   It exists to make one statement unavoidable: no finding is not the same as
   no risk. Everything here is about the part of the estate SUNSET could not
   speak for, ranked by what it would take to fix, and every row is actionable
   rather than apologetic.
   ========================================================================= */

export function Coverage({
  analysis,
  onNavigate,
}: {
  analysis: AnalysisResult;
  onNavigate: (view: ViewId) => void;
}) {
  const { dispatch } = useStore();
  const { coverage } = analysis;

  const openReason = (reason: GapReason) => {
    dispatch({ type: 'filters/reset' });
    dispatch({ type: 'filters', patch: { onlyUnknown: reason !== 'missing-agility' } });
    onNavigate('inventory');
  };

  return (
    <div className="pb-10">
      <section className="border-b border-rule px-4 py-6 lg:px-6">
        <SectionHead
          title="COVERAGE"
          meta={`${coverage.total} findings from ${analysis.inventory.assets.length} inventory entries`}
        />
        <div className="mt-5">
          <CoverageRing
            coverage={coverage}
            onSelect={(state) => {
              dispatch({ type: 'filters/reset' });
              if (state === 'unknown') dispatch({ type: 'filters', patch: { onlyUnknown: true } });
              onNavigate('inventory');
            }}
          />
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="px-4 pt-5 lg:px-6">
          <SectionHead
            title="WHY CAN'T WE ASSESS THIS?"
            meta="ranked by how many findings each missing field is holding up"
          />
        </div>
        <div className="mt-2">
          <UnknownBreakdown coverage={coverage} onSelectReason={openReason} />
        </div>
      </section>

      <section className="border-b border-rule px-4 py-5 lg:px-6">
        <SectionHead
          title="REMEDIATION FRICTION"
          meta="where the migration effort actually sits"
        />
        <div className="mt-3">
          <AgilityDistribution
            findings={analysis.findings}
            onSelectGrade={(grade) => {
              dispatch({ type: 'filters/reset' });
              dispatch({ type: 'filters', patch: { agilities: [grade] } });
              onNavigate('inventory');
            }}
          />
        </div>
      </section>

      <section className="px-4 py-5 lg:px-6">
        <SectionHead title="WHAT THIS ANALYSIS CANNOT SEE AT ALL" />
        <div className="mt-3 space-y-3 text-sm leading-[19px] text-ink-dim measure">
          <p>
            Coverage above is measured against the inventory that was loaded. It says nothing about
            cryptography the inventory never recorded, and that gap is not small: automated
            discovery cannot see inside most components with embedded cryptography, customised
            applications, or certain operating systems.
          </p>
          <p>
            Two of the inputs this engine needs &mdash; data-secrecy lifetime and estimated
            migration effort &mdash; are not discoverable by any scanner. They are judgements made
            by the team that owns the system. Where they are absent, SUNSET reports UNKNOWN rather
            than substituting a default, because a default produces a confident ranking that nobody
            can defend in review.
          </p>
          {analysis.inventory.parseWarnings.length > 0 ? (
            <p>
              The parser also recorded {analysis.inventory.parseWarnings.length} note
              {analysis.inventory.parseWarnings.length === 1 ? '' : 's'} about entries it could not
              fully read. Those are listed on the import screen.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
