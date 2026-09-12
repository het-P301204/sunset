import { useMemo } from 'react';
import type { Finding } from '@/types/domain';
import { bindingConstraint } from '@/engine/mosca';
import { useMeasure } from '@/hooks/useMeasure';
import { Tooltip } from '@/components/shared/Primitives';

/* ============================================================================
   MOSCA'S INEQUALITY, DRAWN

       T_migrate + T_data_lifetime  >  T_CRQC   =>   migrate now

   Written down it is two lines of arithmetic that a non-specialist nods at and
   does not act on. Drawn on one time axis it becomes obvious: the required
   span is laid end to end from today, the available window runs from today to
   the assumed CRQC year, and if the first overshoots the second the overshoot
   is visible as a length. The number under RESULT is that overshoot.

   The CRQC year is adjustable from here. Dragging it is the fastest way to
   understand that this whole model rests on a date nobody knows, which is a
   thing the operator should feel rather than read.
   ========================================================================= */

const ROW_H = 30;
const LABEL_W = 132;
const PAD_RIGHT = 16;
const AXIS_H = 26;

export function MoscaVisualization({
  finding,
  crqcYear,
  onCrqcChange,
}: {
  finding: Finding;
  crqcYear: number;
  onCrqcChange?: (year: number) => void;
}) {
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const m = finding.mosca;

  if (!m.applicable) {
    return (
      <div ref={ref} className="border border-rule bg-bed-0 p-4">
        <p className="text-sm text-ink-dim measure">
          Mosca&rsquo;s inequality does not govern this finding.{' '}
          <span className="t-data">{finding.asset.algorithm}</span> is{' '}
          {finding.quantumImpact === 'resistant'
            ? 'a post-quantum algorithm, so there is no migration to time.'
            : 'not broken by a quantum computer — Grover reduces its margin but does not make recorded material retroactively readable, so data-secrecy lifetime is not what decides its replacement date.'}
        </p>
      </div>
    );
  }

  if (m.migrationYears === null || m.dataLifetimeYears === null) {
    return <MoscaUnknown finding={finding} />;
  }

  const analysisYear = new Date().getUTCFullYear();
  const required = m.requiredYears!;
  const available = m.crqcHorizonYears;
  const deadlineYears = m.deadlineHorizonYears;
  const span = Math.max(required, available, deadlineYears ?? 0) * 1.12 + 0.6;
  const plotW = Math.max(160, width - LABEL_W - PAD_RIGHT);
  const toX = (years: number) => LABEL_W + (years / span) * plotW;
  const height = ROW_H * 3 + AXIS_H + 8;

  const binding = bindingConstraint(m);
  const insufficient = m.satisfied === false;

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let y = 0; y <= Math.ceil(span); y += Math.ceil(span) > 14 ? 2 : 1) out.push(y);
    return out;
  }, [span]);

  return (
    <div ref={ref} className="w-full">
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={moscaSummary(finding)}>
          <Bar
            y={0}
            label="MIGRATION"
            value={`${m.migrationYears.toFixed(2)} y`}
            x1={toX(0)}
            x2={toX(m.migrationYears)}
            fill="var(--c-ink-dim)"
            opacity={0.42}
          />
          <Bar
            y={ROW_H}
            label="DATA LIFETIME"
            value={`${m.dataLifetimeYears} y`}
            x1={toX(m.migrationYears)}
            x2={toX(required)}
            fill="var(--c-ink-dim)"
            opacity={0.22}
          />
          <Bar
            y={ROW_H * 2}
            label="AVAILABLE WINDOW"
            value={`${available.toFixed(2)} y`}
            x1={toX(0)}
            x2={toX(available)}
            fill={insufficient ? 'var(--c-critical)' : 'var(--c-safe)'}
            opacity={insufficient ? 0.3 : 0.26}
          />

          {/* the overshoot: the entire point of the diagram */}
          {insufficient ? (
            <g>
              <rect
                x={toX(available)}
                y={ROW_H * 2 + 7}
                width={Math.max(1, toX(required) - toX(available))}
                height={ROW_H - 14}
                fill="url(#hx-critical)"
              />
              <line
                x1={toX(available)}
                y1={ROW_H * 2 + 4}
                x2={toX(available)}
                y2={ROW_H * 2 + ROW_H - 4}
                stroke="var(--c-critical)"
                strokeWidth="1"
              />
              <text
                x={toX(required) + 6}
                y={ROW_H * 2 + ROW_H / 2 + 3}
                className="t-data"
                fontSize="10"
                fill="var(--c-critical)"
              >
                {Math.abs(m.slackYears!).toFixed(1)}y short
              </text>
            </g>
          ) : null}

          {/* CRQC horizon */}
          <line
            x1={toX(available)}
            y1={2}
            x2={toX(available)}
            y2={ROW_H * 3}
            stroke="var(--c-ink)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.7"
          />
          <text
            x={toX(available) + 4}
            y={10}
            className="t-data"
            fontSize="9"
            letterSpacing="0.1em"
            fill="var(--c-ink-dim)"
          >
            CRQC {crqcYear}
          </text>

          {/* regulatory deadline */}
          {deadlineYears !== null && finding.anchor ? (
            <>
              <line
                x1={toX(deadlineYears)}
                y1={2}
                x2={toX(deadlineYears)}
                y2={ROW_H * 3}
                stroke="var(--c-amber)"
                strokeWidth="1.5"
              />
              <text
                x={toX(deadlineYears) + 4}
                y={ROW_H * 3 - 2}
                className="t-data"
                fontSize="9"
                letterSpacing="0.1em"
                fill="var(--c-amber)"
              >
                {finding.anchor.deadline.year}
              </text>
            </>
          ) : null}

          {/* axis */}
          <g>
            <line
              x1={LABEL_W}
              y1={ROW_H * 3 + 6}
              x2={LABEL_W + plotW}
              y2={ROW_H * 3 + 6}
              stroke="var(--c-rule)"
            />
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={toX(t)}
                  y1={ROW_H * 3 + 6}
                  x2={toX(t)}
                  y2={ROW_H * 3 + 10}
                  stroke="var(--c-rule-strong)"
                />
                <text
                  x={toX(t)}
                  y={ROW_H * 3 + 21}
                  textAnchor="middle"
                  className="t-data"
                  fontSize="9"
                  fill="var(--c-ink-faint)"
                >
                  {analysisYear + t}
                </text>
              </g>
            ))}
          </g>
        </svg>
      ) : (
        <div className="h-[124px]" />
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
        <div className="flex items-baseline gap-3">
          <span className="t-label">RESULT</span>
          <span
            className="t-data text-lg"
            style={{ color: insufficient ? 'var(--c-critical)' : 'var(--c-safe)' }}
          >
            {insufficient ? 'MIGRATE NOW' : 'WINDOW HOLDS'}
          </span>
          <Tooltip
            label="BINDING CONSTRAINT"
            body={
              binding === 'mosca'
                ? 'The CRQC horizon binds before the regulatory deadline does. Exposure, not compliance, is what makes this urgent.'
                : binding === 'deadline'
                  ? 'The regulatory deadline binds before the CRQC horizon does. This is a compliance date, and the exposure window is wider than it.'
                  : 'Neither constraint can be evaluated.'
            }
          >
            <span className="t-data cursor-help border border-rule px-1.5 text-2xs uppercase tracking-[0.08em] text-ink-muted">
              bound by {binding === 'none' ? 'nothing' : binding}
            </span>
          </Tooltip>
        </div>

        {onCrqcChange ? (
          <label className="flex items-center gap-2.5">
            <span className="t-label whitespace-nowrap">CRQC ASSUMPTION</span>
            <input
              type="range"
              min={2026}
              max={2050}
              step={1}
              value={crqcYear}
              onChange={(e) => onCrqcChange(Number(e.target.value))}
              className="sunset-range h-1 w-40 cursor-pointer appearance-none rounded-full bg-bed-3"
              aria-label="Assumed CRQC year"
            />
            <span className="t-data w-9 text-sm text-amber">{crqcYear}</span>
          </label>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-[18px] text-ink-muted measure">
        {insufficient ? (
          <>
            Migration takes {m.migrationYears.toFixed(2)} years and the data stays sensitive for{' '}
            {m.dataLifetimeYears} after that, so {required.toFixed(2)} years of protection are
            required. Only {available.toFixed(2)} remain before the assumed CRQC year. The material
            recorded in the gap is already exposed.
          </>
        ) : (
          <>
            {required.toFixed(2)} years of protection are required and {available.toFixed(2)}{' '}
            remain before the assumed CRQC year, leaving {m.slackYears!.toFixed(2)} years of slack.
            {m.deadlineSlackYears !== null && m.deadlineSlackYears < 2
              ? ` The regulatory deadline is tighter: ${m.deadlineSlackYears.toFixed(2)} years of slack against it.`
              : ''}
          </>
        )}
      </p>
    </div>
  );
}

function Bar({
  y,
  label,
  value,
  x1,
  x2,
  fill,
  opacity,
}: {
  y: number;
  label: string;
  value: string;
  x1: number;
  x2: number;
  fill: string;
  opacity: number;
}) {
  return (
    <g>
      <text
        x={0}
        y={y + ROW_H / 2 + 3}
        className="t-data"
        fontSize="9"
        letterSpacing="0.11em"
        fill="var(--c-ink-muted)"
      >
        {label}
      </text>
      <rect
        x={x1}
        y={y + 7}
        width={Math.max(1, x2 - x1)}
        height={ROW_H - 14}
        fill={fill}
        opacity={opacity}
      />
      <rect
        x={x1}
        y={y + 7}
        width={Math.max(1, x2 - x1)}
        height={ROW_H - 14}
        fill="none"
        stroke={fill}
        strokeWidth="1"
        opacity={Math.min(1, opacity + 0.35)}
      />
      <text
        x={x1 + 5}
        y={y + ROW_H / 2 + 3}
        className="t-data"
        fontSize="10"
        fill="var(--c-ink-dim)"
      >
        {value}
      </text>
    </g>
  );
}

function MoscaUnknown({ finding }: { finding: Finding }) {
  const missing = finding.gaps.filter((g) => g.blocking);
  return (
    <div className="border border-dashed border-risk-unknown bg-[color:color-mix(in_srgb,var(--c-unknown)_6%,transparent)] p-4">
      <div className="flex items-baseline gap-3">
        <span className="t-label text-risk-unknown">CANNOT BE EVALUATED</span>
      </div>
      <p className="mt-2 text-sm leading-[18px] text-ink-dim measure">
        Mosca&rsquo;s inequality needs two operator inputs that this inventory does not carry.
        SUNSET does not substitute an average for them, because a plausible average produces a
        plausible ranking that nobody can defend.
      </p>
      <ul className="mt-3 space-y-1.5">
        {missing.map((gap) => (
          <li key={gap.field} className="flex items-baseline gap-2.5">
            <span className="t-data shrink-0 text-2xs text-risk-unknown">{gap.field}</span>
            <span className="text-xs text-ink-muted">{gap.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function moscaSummary(finding: Finding): string {
  const m = finding.mosca;
  if (m.requiredYears === null) return 'Mosca inequality cannot be evaluated: inputs are missing.';
  return `Migration ${m.migrationYears} years plus data lifetime ${m.dataLifetimeYears} years requires ${m.requiredYears} years; ${m.crqcHorizonYears} years remain before the assumed CRQC year ${m.crqcYear}. Result: ${m.satisfied ? 'window holds' : 'migrate now'}.`;
}
