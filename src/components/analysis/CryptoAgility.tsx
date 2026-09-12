import type { AgilityGrade, Finding } from '@/types/domain';
import { AGILITY_ORDER } from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';

/* ============================================================================
   THE AGILITY SPECTRUM

   A badge saying HARD-CODED tells you a fact. A position on a spectrum tells
   you a cost, and where it sits relative to everything else in the estate.
   That is what an operator is actually deciding with: not "is this hard" but
   "is this harder than the twelve other things competing for the same
   quarter".

   The spectrum runs left to right from easiest to hardest, and the UNKNOWN
   grade sits off the scale rather than at one end, because an unestablished
   grade is not "moderately difficult".
   ========================================================================= */

const NOTES: Record<AgilityGrade, string> = {
  negotiated: 'Configuration change on both endpoints.',
  configuration: 'Controlled change, no release.',
  hardcoded: 'Code change and a release.',
  'vendor-controlled': 'Depends on a third party.',
  unknown: 'Not established.',
};

export function AgilitySpectrum({ finding }: { finding: Finding }) {
  const position = finding.agility.position;
  const inferred = finding.agility.basis === 'protocol-inference';

  return (
    <div className="w-full">
      <div className="relative pt-5">
        <div className="absolute left-0 right-0 top-[30px] h-px bg-rule" aria-hidden="true" />
        <ol className="relative grid grid-cols-4">
          {AGILITY_ORDER.map((grade, index) => {
            const active = position === index;
            return (
              <li key={grade} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`t-data text-3xs uppercase leading-tight tracking-[0.08em] ${
                    active ? 'text-ink' : 'text-ink-faint'
                  }`}
                >
                  {AGILITY_LABEL[grade]}
                </span>
                <span
                  aria-hidden="true"
                  className={`relative block ${active ? 'h-3.5 w-3.5' : 'h-2 w-2'} border transition-all duration-base ease-out`}
                  style={{
                    background: active ? 'var(--c-ink)' : 'var(--c-bed-2)',
                    borderColor: active ? 'var(--c-ink)' : 'var(--c-rule-strong)',
                    marginTop: active ? 0 : 3,
                  }}
                />
                <span
                  className={`text-2xs leading-[13px] ${active ? 'text-ink-dim' : 'text-ink-faint'}`}
                >
                  {NOTES[grade]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {position === null ? (
        <p className="mt-3 border border-dashed border-risk-unknown px-3 py-2 text-sm text-risk-unknown">
          Off the scale: no agility grade was supplied and the protocol does not determine one.
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-dim measure">
          {finding.agility.note}
          {inferred ? null : null}
        </p>
      )}
    </div>
  );
}

/**
 * The same spectrum across the whole estate: where the remediation friction
 * actually sits. A tall bar on the right is a procurement problem, not an
 * engineering one, and that changes who owns the migration.
 */
export function AgilityDistribution({
  findings,
  onSelectGrade,
}: {
  findings: Finding[];
  onSelectGrade?: (grade: AgilityGrade) => void;
}) {
  const grades: AgilityGrade[] = [...AGILITY_ORDER, 'unknown'];
  const counts = grades.map((grade) => ({
    grade,
    count: findings.filter((f) => f.agility.grade === grade).length,
    critical: findings.filter((f) => f.agility.grade === grade && f.severity === 'critical').length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div className="grid grid-cols-5 gap-px bg-rule-faint">
      {counts.map(({ grade, count, critical }) => (
        <button
          key={grade}
          type="button"
          onClick={() => onSelectGrade?.(grade)}
          className="group flex flex-col justify-end gap-2 bg-bed-0 p-3 text-left transition-colors duration-fast ease-out hover:bg-bed-1"
        >
          <div className="flex h-20 items-end">
            <div
              className="relative w-full border-t"
              style={{
                height: `${Math.max(3, (count / max) * 100)}%`,
                borderColor: grade === 'unknown' ? 'var(--c-unknown)' : 'var(--c-ink-dim)',
              }}
            >
              <svg width="100%" height="100%" className="block" aria-hidden="true">
                <rect
                  width="100%"
                  height="100%"
                  fill={grade === 'unknown' ? 'url(#hx-unknown)' : 'url(#hx-assessed)'}
                />
              </svg>
            </div>
          </div>
          <div>
            <div className="t-data text-lg leading-none text-ink">{count}</div>
            <div
              className={`t-label mt-1 text-3xs leading-tight ${
                grade === 'unknown' ? 'text-risk-unknown' : ''
              }`}
            >
              {AGILITY_LABEL[grade]}
            </div>
            {critical > 0 ? (
              <div className="t-data mt-1 text-2xs text-risk-critical">{critical} critical</div>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}
