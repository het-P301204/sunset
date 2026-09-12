import { useState } from 'react';
import type { Coverage, GapReason } from '@/types/domain';

/* ============================================================================
   COVERAGE

   The ring is drawn as a ruled annulus rather than a donut chart: three arcs,
   hatched with the same patterns the rest of the interface uses, with a hard
   tick at each boundary. Hovering an arc reads it out; nothing is a tooltip
   with a percentage and no meaning.

   The number in the middle is ASSESSABLE, not ASSESSED, and the difference is
   stated underneath. Reporting the flattering one is how a coverage figure
   stops being useful.
   ========================================================================= */

const SIZE = 188;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CoverageRing({
  coverage,
  onSelect,
}: {
  coverage: Coverage;
  onSelect?: (state: 'assessed' | 'partial' | 'unknown') => void;
}) {
  const [hover, setHover] = useState<'assessed' | 'partial' | 'unknown' | null>(null);
  const total = Math.max(1, coverage.total);

  const arcs = [
    {
      id: 'assessed' as const,
      label: 'ASSESSED',
      count: coverage.assessed,
      fill: 'url(#hx-assessed)',
      stroke: 'var(--c-ink-dim)',
      detail: 'Every input the scoring model needs was present.',
    },
    {
      id: 'partial' as const,
      label: 'PARTIALLY ASSESSED',
      count: coverage.partial,
      fill: 'url(#hx-partial)',
      stroke: 'var(--c-ink-muted)',
      detail: 'Scored, with at least one non-blocking input missing. Confidence is reduced.',
    },
    {
      id: 'unknown' as const,
      label: 'UNKNOWN',
      count: coverage.unknown,
      fill: 'url(#hx-unknown)',
      stroke: 'var(--c-unknown)',
      detail: 'Not scored. A blocking input was absent and is named on each finding.',
    },
  ];

  let offset = 0;
  const active = hover ? arcs.find((a) => a.id === hover)! : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-7">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Coverage: ${coverage.assessed} assessed, ${coverage.partial} partially assessed, ${coverage.unknown} unknown, of ${coverage.total} findings.`}
        className="shrink-0"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--c-rule-faint)"
          strokeWidth={STROKE}
        />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map((arc) => {
            const fraction = arc.count / total;
            const length = fraction * CIRCUMFERENCE;
            const dash = `${length} ${CIRCUMFERENCE - length}`;
            const element = (
              <g key={arc.id}>
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={arc.fill}
                  strokeWidth={STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  opacity={hover && hover !== arc.id ? 0.35 : 1}
                  className="cursor-pointer transition-opacity duration-fast"
                  onMouseEnter={() => setHover(arc.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelect?.(arc.id)}
                />
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={arc.stroke}
                  strokeWidth={STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  opacity={0.001}
                  pointerEvents="none"
                />
                {/* boundary tick */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={arc.stroke}
                  strokeWidth={STROKE}
                  strokeDasharray={`1 ${CIRCUMFERENCE - 1}`}
                  strokeDashoffset={-offset}
                  pointerEvents="none"
                />
              </g>
            );
            offset += length;
            return element;
          })}
        </g>

        <text
          x={SIZE / 2}
          y={SIZE / 2 - 2}
          textAnchor="middle"
          className="t-data"
          fontSize="34"
          fontWeight="300"
          fill={active ? active.stroke : 'var(--c-ink)'}
        >
          {active
            ? `${Math.round((active.count / total) * 100)}%`
            : `${Math.round(coverage.assessableRatio * 100)}%`}
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 14}
          textAnchor="middle"
          className="t-data"
          fontSize="8.5"
          letterSpacing="0.16em"
          fill="var(--c-ink-muted)"
        >
          {active ? active.label : 'ASSESSABLE'}
        </text>
      </svg>

      <dl className="min-w-0 flex-1 divide-y divide-rule-faint border-y border-rule-faint">
        {arcs.map((arc) => (
          <div
            key={arc.id}
            onMouseEnter={() => setHover(arc.id)}
            onMouseLeave={() => setHover(null)}
            className="grid grid-cols-[3.5rem_1fr] items-baseline gap-3 py-2"
          >
            <dt className="t-data text-lg leading-none" style={{ color: arc.stroke }}>
              {Math.round((arc.count / total) * 100)}%
            </dt>
            <dd>
              <span className="t-label text-3xs" style={{ color: arc.stroke }}>
                {arc.label}
              </span>
              <span className="t-data ml-2 text-2xs text-ink-faint">{arc.count}</span>
              <p className="mt-0.5 text-xs leading-[16px] text-ink-muted">{arc.detail}</p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Why the unassessed part is unassessed, ranked by how many findings each
 * cause is holding up. This is the list somebody actually works through: fix
 * the top row and the coverage figure moves the most.
 */
/** Reasons that stop a finding being scored at all, as opposed to reducing confidence. */
const BLOCKING_REASONS = new Set<GapReason>([
  'missing-data-lifetime',
  'missing-migration-effort',
  'unrecognized-algorithm',
  'unsupported-evidence',
]);

export function UnknownBreakdown({
  coverage,
  onSelectReason,
}: {
  coverage: Coverage;
  onSelectReason: (reason: GapReason) => void;
}) {
  const max = Math.max(...coverage.breakdown.map((b) => b.count), 1);

  if (coverage.breakdown.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-ink-muted">
        Nothing is missing. Every finding in this inventory carried every input the model needs,
        which is unusual enough to be worth checking.
      </p>
    );
  }

  return (
    <>
      <p className="px-4 pb-2 text-xs text-ink-faint">
        A finding can be held up by more than one field, so these counts overlap and do not sum to
        the {coverage.unknown} unscored findings.
      </p>
      <ul className="divide-y divide-rule-faint">
        {coverage.breakdown.map((row) => {
          const blocking = BLOCKING_REASONS.has(row.reason);
          return (
            <li key={row.reason}>
              <button
                type="button"
                onClick={() => onSelectReason(row.reason)}
                className="group grid w-full grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-4 px-4 py-3 text-left transition-colors duration-fast ease-out hover:bg-bed-1 sm:grid-cols-[3.5rem_minmax(0,16rem)_minmax(0,1fr)]"
              >
                <span
                  className="t-data pt-0.5 text-xl leading-none"
                  style={{ color: blocking ? 'var(--c-unknown)' : 'var(--c-ink-muted)' }}
                >
                  {row.count}
                </span>

                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm text-ink">{row.label}</span>
                    <span
                      className={`t-data text-3xs uppercase tracking-[0.08em] ${
                        blocking ? 'text-risk-unknown' : 'text-ink-faint'
                      }`}
                    >
                      {blocking ? 'blocking' : 'advisory'}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 bg-bed-2">
                      <span
                        className="block h-full"
                        style={{
                          width: `${(row.count / max) * 100}%`,
                          background: blocking ? 'var(--c-unknown)' : 'var(--c-ink-faint)',
                        }}
                      />
                    </span>
                    <span className="t-data w-10 text-right text-2xs text-ink-faint">
                      {Math.round((row.count / Math.max(1, coverage.total)) * 100)}%
                    </span>
                  </span>
                </span>

                <span className="col-span-2 mt-2 text-xs leading-[16px] text-ink-muted sm:col-span-1 sm:mt-0">
                  {row.remedy}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
