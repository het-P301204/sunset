import type { Finding } from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';
import { VERDICT_LABEL } from '@/engine/score';
import { SeverityBadge } from '@/components/shared/Primitives';

/* ============================================================================
   The hover card.

   Shown from the timeline and the threat matrix. It answers the seven
   questions an operator asks of a node before deciding whether to open it, and
   it says "not supplied" in the unknown colour rather than leaving a blank —
   a blank cell reads as zero.
   ========================================================================= */

export function FindingCard({ finding }: { finding: Finding }) {
  const rows: [string, string, boolean][] = [
    ['Asset', finding.asset.name, false],
    ['Algorithm', finding.asset.algorithm, true],
    ['Threat class', finding.threatClass.replace('-', ' ').toUpperCase(), false],
    [
      'Data lifetime',
      finding.mosca.dataLifetimeYears === null
        ? 'not supplied'
        : `${finding.mosca.dataLifetimeYears} years`,
      finding.mosca.dataLifetimeYears === null,
    ],
    [
      'Migration effort',
      finding.context?.migrationEffortMonths === undefined
        ? 'not supplied'
        : `${finding.context.migrationEffortMonths} months`,
      finding.context?.migrationEffortMonths === undefined,
    ],
    [
      'Deadline',
      finding.anchor
        ? `${finding.anchor.deadline.year} · ${finding.anchor.deadline.authority}`
        : 'none governs this class',
      !finding.anchor,
    ],
    ['Agility', AGILITY_LABEL[finding.agility.grade], finding.agility.grade === 'unknown'],
    [
      'Confidence',
      finding.confidence.toUpperCase(),
      finding.confidence === 'none' || finding.confidence === 'low',
    ],
  ];

  return (
    <div className="rounded-panel border border-rule bg-bed-2 p-3 shadow-pop">
      <div className="flex items-center justify-between gap-3 border-b border-rule-faint pb-2">
        <span className="t-data text-sm text-ink">{finding.asset.algorithm}</span>
        <SeverityBadge severity={finding.severity} size="sm" />
      </div>
      <dl className="mt-2 space-y-0.5">
        {rows.map(([label, value, unknown]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="t-label text-3xs">{label}</dt>
            <dd
              className={`t-data truncate text-xs ${unknown ? 'text-risk-unknown' : 'text-ink-dim'}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex items-center justify-between border-t border-rule-faint pt-2">
        <span className="t-label text-3xs">Verdict</span>
        <span
          className={`t-data text-2xs uppercase tracking-[0.1em] ${
            finding.verdict === 'migrate-now'
              ? 'text-risk-critical'
              : finding.verdict === 'insufficient-data'
                ? 'text-risk-unknown'
                : 'text-ink-dim'
          }`}
        >
          {VERDICT_LABEL[finding.verdict]}
        </span>
      </div>
    </div>
  );
}
