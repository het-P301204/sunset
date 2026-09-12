import type { Finding } from '@/types/domain';
import { SEVERITY_LABEL, SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';

/* ============================================================================
   THE EVIDENCE CHAIN

   Answers one question: why is this ranked where it is?

   Each line is a term the scoring function actually evaluated, with the points
   it contributed, in the order it was applied. Nothing is summarised and
   nothing is hidden behind a model. If the operator disagrees with the
   position, this tells them exactly which line to argue with — and every line
   names whether its value came from the inventory, the operator's own context
   file, or an assumption.
   ========================================================================= */

export function RiskExplanation({ finding }: { finding: Finding }) {
  const steps = finding.reasoning;
  const scored = finding.urgencyScore !== null;

  return (
    <div>
      <ol className="divide-y divide-rule-faint border-y border-rule-faint">
        {steps.map((step, index) => {
          const isTotal = step.label === 'Urgency score';
          return (
            <li
              key={`${step.label}-${index}`}
              className={`grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-baseline gap-3 py-1.5 ${
                isTotal ? 'bg-bed-1' : ''
              }`}
            >
              <span
                className={`t-label ${
                  step.tone === 'unknown' ? 'text-risk-unknown' : ''
                } ${isTotal ? 'text-ink-dim' : ''}`}
              >
                {step.label}
              </span>
              <span
                className={`text-sm ${
                  step.tone === 'aggravating'
                    ? 'text-ink'
                    : step.tone === 'mitigating'
                      ? 'text-ink-dim'
                      : step.tone === 'unknown'
                        ? 'text-risk-unknown t-data'
                        : 'text-ink-dim'
                }`}
              >
                {step.value}
              </span>
              <span
                className={`t-data text-right text-xs ${
                  step.weight === undefined
                    ? 'text-transparent'
                    : step.weight > 0
                      ? 'text-ink-dim'
                      : 'text-ink-faint'
                }`}
              >
                {step.weight === undefined
                  ? '—'
                  : step.weight > 0
                    ? `+${step.weight}`
                    : String(step.weight)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center gap-3">
        <span className="t-label">THEREFORE</span>
        <span
          className="flex items-center gap-2 t-data text-lg"
          style={{ color: SEVERITY_VAR[finding.severity] }}
        >
          <SeverityMark severity={finding.severity} size={12} />
          {SEVERITY_LABEL[finding.severity]}
        </span>
        {scored && finding.rank !== null ? (
          <span className="t-data text-sm text-ink-muted">
            rank {String(finding.rank).padStart(2, '0')}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The gap list. Every entry names a field, not a feeling. */
export function GapList({ finding }: { finding: Finding }) {
  if (finding.gaps.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Every input the scoring model needs was present for this finding.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {finding.gaps.map((gap) => (
        <li
          key={`${gap.reason}-${gap.field}`}
          className={`border-l-[1px] pl-3 ${
            gap.blocking ? 'border-risk-unknown' : 'border-rule-strong'
          }`}
        >
          <div className="flex items-baseline gap-2">
            <span
              className={`t-data text-2xs ${
                gap.blocking ? 'text-risk-unknown' : 'text-ink-muted'
              }`}
            >
              {gap.field}
            </span>
            <span className="t-label text-[9px]">
              {gap.blocking ? 'BLOCKING' : 'REDUCES CONFIDENCE'}
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-[18px] text-ink-dim measure">{gap.detail}</p>
        </li>
      ))}
    </ul>
  );
}
