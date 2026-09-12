import type { Finding } from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';
import { AGILITY_ORDER } from '@/types/domain';
import { SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';
import { Tooltip } from '@/components/shared/Primitives';

/* ============================================================================
   THE MIGRATION QUEUE

   Each row carries its own argument. The urgency bar is not a progress bar: it
   is the score broken into the terms that produced it, each segment sized by
   its weight and named on hover. An operator can read why position 3 is above
   position 4 without opening either of them, and can defend the order to
   someone who did not run the tool.

   The rank numeral sits in the margin and is set large, because the sequence
   IS the deliverable. That is the one place in this interface where a leading
   number earns its size.
   ========================================================================= */

export function PriorityQueue({
  findings,
  onSelect,
  selectedId,
  startIndex = 0,
}: {
  findings: Finding[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  startIndex?: number;
}) {
  const maxScore = Math.max(...findings.map((f) => f.urgencyScore ?? 0), 1);

  return (
    <ol className="divide-y divide-rule-faint">
      {findings.map((finding, index) => (
        <QueueRow
          key={finding.id}
          finding={finding}
          position={finding.rank ?? startIndex + index + 1}
          maxScore={maxScore}
          selected={selectedId === finding.id}
          onSelect={onSelect}
        />
      ))}
    </ol>
  );
}

function QueueRow({
  finding,
  position,
  maxScore,
  selected,
  onSelect,
}: {
  finding: Finding;
  position: number;
  maxScore: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(finding.id)}
        aria-current={selected ? 'true' : undefined}
        className={`group grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3 px-4 py-3 text-left transition-colors duration-fast ease-out hover:bg-bed-1 lg:grid-cols-[2.75rem_minmax(0,1.1fr)_minmax(9rem,0.8fr)_minmax(8rem,0.6fr)] lg:gap-x-5 ${
          selected ? 'bg-bed-1' : ''
        }`}
      >
        <span
          className="t-data pt-0.5 text-right text-xl font-light leading-none text-ink-faint transition-colors duration-fast group-hover:text-ink-muted"
          aria-hidden="true"
        >
          {String(position).padStart(2, '0')}
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="truncate text-md text-ink">{finding.asset.name}</span>
            <span className="t-data text-sm text-ink-dim">{finding.asset.algorithm}</span>
            {finding.hndl ? (
              <Tooltip
                label="HNDL"
                body="Harvest now, decrypt later. Traffic recorded today is readable once a CRQC exists, so the exposure has already begun."
              >
                <span className="t-data cursor-help border border-rule px-1 text-3xs uppercase tracking-[0.1em] text-ink-muted">
                  HNDL
                </span>
              </Tooltip>
            ) : null}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <SeverityBadgeInline finding={finding} />
            <span className="t-data text-2xs text-ink-muted">
              {finding.threatClass.replace('-', ' ').toUpperCase()}
            </span>
            {finding.asset.source.locator ? (
              <span className="t-data truncate text-2xs text-ink-faint">
                {finding.asset.source.locator}
                {finding.asset.source.line ? `:${finding.asset.source.line}` : ''}
              </span>
            ) : null}
          </span>
        </span>

        <span className="col-start-2 mt-2.5 lg:col-start-3 lg:mt-0">
          <UrgencyBar finding={finding} maxScore={maxScore} />
        </span>

        <span className="col-start-2 mt-2.5 grid grid-cols-3 gap-x-3 lg:col-start-4 lg:mt-0 lg:grid-cols-1 lg:gap-y-1">
          <Metric
            label="DEADLINE"
            value={finding.anchor ? String(finding.anchor.deadline.year) : 'none'}
            unknown={!finding.anchor}
          />
          <Metric
            label="LIFETIME"
            value={
              finding.mosca.dataLifetimeYears === null
                ? 'not supplied'
                : `${finding.mosca.dataLifetimeYears}y`
            }
            unknown={finding.mosca.dataLifetimeYears === null}
          />
          <Metric
            label="EFFORT"
            value={
              finding.context?.migrationEffortMonths === undefined
                ? 'not supplied'
                : `${finding.context.migrationEffortMonths}mo`
            }
            unknown={finding.context?.migrationEffortMonths === undefined}
          />
        </span>
      </button>
    </li>
  );
}

function SeverityBadgeInline({ finding }: { finding: Finding }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 t-data text-2xs uppercase tracking-[0.1em]"
      style={{ color: SEVERITY_VAR[finding.severity] }}
    >
      <SeverityMark severity={finding.severity} size={8} />
      {finding.severity}
    </span>
  );
}

function Metric({
  label,
  value,
  unknown,
}: {
  label: string;
  value: string;
  unknown: boolean;
}) {
  return (
    <span className="flex flex-col gap-0.5 lg:flex-row lg:items-baseline lg:justify-between lg:gap-2">
      <span className="t-label text-3xs">{label}</span>
      <span className={`t-data text-xs ${unknown ? 'text-risk-unknown' : 'text-ink-dim'}`}>
        {value}
      </span>
    </span>
  );
}

/**
 * The score, broken into the terms that produced it. Segment width is the
 * term's weight; the multiplier term is drawn as a separate trailing mark
 * because it scales the sum rather than adding to it.
 */
export function UrgencyBar({
  finding,
  maxScore,
  height = 10,
}: {
  finding: Finding;
  maxScore: number;
  height?: number;
}) {
  if (finding.urgencyScore === null) {
    const blocking = finding.gaps.find((g) => g.blocking);
    return (
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="t-data text-sm text-risk-unknown">NOT SCORED</span>
        </span>
        <span className="flex h-2 w-full items-stretch border border-dashed border-risk-unknown">
          <svg width="100%" height="100%" aria-hidden="true">
            <rect width="100%" height="100%" fill="url(#hx-unknown)" />
          </svg>
        </span>
        <span className="text-2xs text-ink-muted">
          {blocking ? `missing ${blocking.field}` : 'a required input was absent'}
        </span>
      </span>
    );
  }

  const additive = finding.reasoning.filter(
    (step) => step.weight !== undefined && step.weight > 0 && step.label !== 'Crypto-agility',
  );
  const agilityStep = finding.reasoning.find((s) => s.label === 'Crypto-agility');
  const sum = additive.reduce((acc, s) => acc + (s.weight ?? 0), 0) || 1;
  const barWidth = (finding.urgencyScore / maxScore) * 100;

  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-baseline gap-2">
        <span
          className="t-data text-sm"
          style={{ color: SEVERITY_VAR[finding.severity] }}
        >
          {finding.urgencyScore}
        </span>
        <span className="t-data text-2xs text-ink-faint">/ 100</span>
        {agilityStep ? (
          <Tooltip label="CRYPTO-AGILITY" body={agilityStep.value}>
            <span className="t-data cursor-help text-2xs text-ink-muted">
              {agilityStep.value.match(/x[\d.]+/)?.[0] ?? ''}
            </span>
          </Tooltip>
        ) : null}
      </span>

      {/* Segment widths come from `flex-grow`, not from a width on a wrapped
          element: an inline-flex wrapper between the track and the segment
          swallows a percentage width and collapses every term to its minimum.
          Each segment carries a title for the pointer; the whole bar carries an
          aria-label with the same terms, and the drawer has the full chain. */}
      <span
        className="flex w-full items-stretch overflow-hidden bg-bed-2"
        style={{ height }}
        role="img"
        aria-label={`Urgency ${finding.urgencyScore} of 100, composed of ${additive
          .map((s) => `${s.label} ${s.weight}`)
          .join(', ')}`}
      >
        <span className="flex" style={{ width: `${barWidth}%` }}>
          {additive.map((step, i) => (
            <span
              key={`${step.label}-${i}`}
              title={`${step.label.toUpperCase()} — ${step.value}. Contributes ${step.weight} of ${sum} points.`}
              className="block h-full cursor-help border-r border-[color:var(--c-ground)] last:border-r-0"
              style={{
                flex: `${step.weight ?? 0} 1 0%`,
                minWidth: 2,
                background: SEVERITY_VAR[finding.severity],
                opacity: 0.34 + (1 - i / Math.max(1, additive.length)) * 0.58,
              }}
            />
          ))}
        </span>
      </span>

      <span className="flex items-center gap-1.5">
        <AgilitySpark grade={finding.agility.grade} />
        <span className="t-data text-2xs text-ink-faint">
          {AGILITY_LABEL[finding.agility.grade]}
        </span>
      </span>
    </span>
  );
}

/** Four ticks; the filled one is the grade. Reads without colour. */
export function AgilitySpark({ grade }: { grade: Finding['agility']['grade'] }) {
  const position = AGILITY_ORDER.indexOf(grade);
  return (
    <span className="flex items-end gap-[2px]" aria-hidden="true">
      {AGILITY_ORDER.map((_, i) => (
        <span
          key={i}
          className="block w-[3px]"
          style={{
            height: 4 + i * 2,
            background:
              position === -1
                ? 'var(--c-rule-strong)'
                : i <= position
                  ? 'var(--c-ink-dim)'
                  : 'var(--c-rule-strong)',
            opacity: position === -1 ? 0.4 : 1,
          }}
        />
      ))}
    </span>
  );
}
