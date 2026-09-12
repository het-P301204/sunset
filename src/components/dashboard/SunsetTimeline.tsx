import { useMemo, useState } from 'react';
import type { AnalysisResult, Finding, ThreatClass } from '@/types/domain';
import { DEADLINES, TIMELINE_END, TIMELINE_START } from '@/engine/deadlines';
import { SEVERITY_VAR, hatchFill } from '@/components/shared/Hatch';
import { useMeasure } from '@/hooks/useMeasure';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FindingCard } from './FindingCard';

/* ============================================================================
   THE SUNSET TIMELINE

   The product's signature surface, and a stratigraphic column laid on its side.

   The x axis is the year the work has to START, not the year the deadline
   falls. That distinction is the whole reason this is not a Gantt chart: a
   fourteen-month migration due in 2030 has to begin in 2028, and a timeline
   that plots it at 2030 has told the operator the comfortable half of the
   truth. Findings with no effort estimate are plotted at their deadline and
   drawn hollow, because their start date is not known.

   Deadlines are marker horizons: amber rules straight through every lane, the
   way a correlatable bed is drawn through every log in a section.

   The OFF AXIS band at the foot holds everything with no position here, split
   into the two reasons that are not the same thing: NOT SCORED (a required
   input was absent) and NO DEADLINE (assessed, but no published instrument
   sets a date for it). Both are drawn to scale and neither is ever omitted.

   Reading it is a two-column problem. The lane margin never scrolls, because a
   row label that slides out of view takes the meaning of its row with it; only
   the plot scrolls, and the two halves share their row constants so they stay
   registered.
   ========================================================================= */

const LANES: { id: ThreatClass; label: string }[] = [
  { id: 'key-establishment', label: 'KEY ESTABLISHMENT' },
  { id: 'signature', label: 'SIGNATURE' },
  { id: 'symmetric', label: 'SYMMETRIC' },
  { id: 'hash', label: 'HASH' },
];

/** Shared row geometry. The margin and the plot both measure from these. */
const MARGIN_W = 136;
const PAD_RIGHT = 26;
const RULER_H = 38;
const LANE_H = 78;
const VOID_H = 48;
const MIN_PLOT_W = 660;

/** A bed. Big enough to read as a block rather than as dust. */
const NODE = 9;
const NODE_GAP = 2;
const CELL = NODE + NODE_GAP;
const MAX_STACK = 4;

interface Cluster {
  laneIndex: number;
  year: number;
  findings: Finding[];
  columns: number;
}

interface PlacedNode {
  finding: Finding;
  x: number;
  y: number;
  hollow: boolean;
  order: number;
}

export function SunsetTimeline({
  analysis,
  onSelect,
  selectedId,
  compact = false,
}: {
  analysis: AnalysisResult;
  onSelect: (id: string) => void;
  selectedId?: string | null;
  compact?: boolean;
}) {
  const [scrollRef, { width: viewport }] = useMeasure<HTMLDivElement>();
  const [hovered, setHovered] = useState<PlacedNode | null>(null);
  const reduced = useReducedMotion();

  const lanes = compact ? LANES.slice(0, 2) : LANES;
  const height = RULER_H + lanes.length * LANE_H + VOID_H;
  const plotWidth = Math.max(MIN_PLOT_W, viewport - PAD_RIGHT);
  const analysisYear = new Date(analysis.analysedAt).getUTCFullYear();

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = TIMELINE_START; y <= TIMELINE_END; y += 1) out.push(y);
    return out;
  }, []);

  const span = TIMELINE_END - TIMELINE_START;
  const scale = (year: number) =>
    ((clamp(year, TIMELINE_START, TIMELINE_END) - TIMELINE_START) / span) * plotWidth;
  const yearWidth = plotWidth / span;

  const { clusters, placed, notScored, noDeadline } = useMemo(
    () => place(analysis, lanes, scale, plotWidth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis, plotWidth, compact],
  );
  const offAxis = notScored.length + noDeadline.length;

  return (
    <div className="flex w-full select-none">
      {/* ---- the margin: lane identity and per-class recovery, never scrolls -- */}
      <div className="shrink-0" style={{ width: MARGIN_W }}>
        <svg width={MARGIN_W} height={height} aria-hidden="true" className="block">
          {lanes.map((lane, index) => {
            const top = RULER_H + index * LANE_H;
            const total = analysis.findings.filter((f) => f.threatClass === lane.id).length;
            const count = placed.filter((p) => p.finding.threatClass === lane.id).length;
            const pct = total === 0 ? 0 : Math.round((count / total) * 100);
            return (
              <g key={lane.id}>
                <line
                  x1={0}
                  y1={top + LANE_H - 0.5}
                  x2={MARGIN_W}
                  y2={top + LANE_H - 0.5}
                  stroke="var(--c-rule-faint)"
                />
                <text
                  x={0}
                  y={top + 22}
                  className="t-data"
                  fontSize="9"
                  letterSpacing="0.1em"
                  fill="var(--c-ink-dim)"
                >
                  {lane.label}
                </text>
                {/* Per-class recovery, the way a driller's log records it run by
                    run rather than once for the whole hole. */}
                <text
                  x={MARGIN_W - 22}
                  y={top + 38}
                  textAnchor="end"
                  className="t-data"
                  fontSize="13"
                  fill={pct === 0 ? 'var(--c-ink-faint)' : 'var(--c-ink-dim)'}
                >
                  {pct}
                  <tspan fontSize="9" fill="var(--c-ink-faint)">
                    %
                  </tspan>
                </text>
                <rect x={0} y={top + 44} width={MARGIN_W - 22} height={3} fill="var(--c-bed-2)" />
                <rect
                  x={0}
                  y={top + 44}
                  width={total === 0 ? 0 : ((MARGIN_W - 22) * count) / total}
                  height={3}
                  fill="var(--c-ink-muted)"
                />
                <text
                  x={0}
                  y={top + 60}
                  className="t-data"
                  fontSize="9"
                  fill="var(--c-ink-faint)"
                >
                  {count} of {total} on axis
                </text>
              </g>
            );
          })}

          <text
            x={0}
            y={height - VOID_H + 22}
            className="t-data"
            fontSize="9"
            letterSpacing="0.1em"
            fill="var(--c-unknown)"
          >
            OFF AXIS
          </text>
          <text
            x={0}
            y={height - VOID_H + 36}
            className="t-data"
            fontSize="13"
            fill="var(--c-ink-dim)"
          >
            {offAxis}
          </text>
        </svg>
      </div>

      {/* ---- the plot: scrolls on its own ----------------------------------- */}
      <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-x-auto">
        {viewport > 0 ? (
          <svg
            width={plotWidth}
            height={height}
            role="img"
            aria-label={`Migration timeline from ${TIMELINE_START} to ${TIMELINE_END}. ${placed.length} findings plotted by the year their migration must start. ${notScored.length} could not be scored and ${noDeadline.length} are governed by no published deadline, so neither group has a position on this axis.`}
            className="block"
          >
            {/* Alternating year columns. Without them a block three lanes down
                cannot be tied to a year without tracing all the way up. */}
            {years.slice(0, -1).map((year, i) =>
              i % 2 === 0 ? (
                <rect
                  key={`band-${year}`}
                  x={scale(year)}
                  y={RULER_H - 8}
                  width={yearWidth}
                  height={height - VOID_H - RULER_H + 8}
                  fill="var(--c-bed-0)"
                />
              ) : null,
            )}

            {/* Everything before today. The work cannot start in the past, so
                the region reads as unavailable rather than as empty. */}
            <rect
              x={0}
              y={RULER_H - 8}
              width={scale(analysisYear)}
              height={height - VOID_H - RULER_H + 8}
              fill="url(#hx-unknown)"
              opacity="0.25"
            />

            {/* ---- year ruler ---------------------------------------------- */}
            <line
              x1={0}
              y1={RULER_H - 0.5}
              x2={plotWidth}
              y2={RULER_H - 0.5}
              stroke="var(--c-rule-strong)"
              style={
                reduced
                  ? undefined
                  : {
                      strokeDasharray: plotWidth,
                      animation: 'tl-draw 700ms var(--ease-out) both',
                    }
              }
            />
            {years.map((year) => {
              const x = scale(year);
              const isNow = year === analysisYear;
              const last = year === TIMELINE_END;
              return (
                <g key={year}>
                  <line
                    x1={x}
                    y1={RULER_H - 7}
                    x2={x}
                    y2={RULER_H}
                    stroke="var(--c-rule-strong)"
                  />
                  <text
                    x={x + (last ? -4 : 4)}
                    y={RULER_H - 13}
                    textAnchor={last ? 'end' : 'start'}
                    className="t-data"
                    fontSize="11"
                    letterSpacing="0.04em"
                    fill={isNow ? 'var(--c-ink)' : 'var(--c-ink-faint)'}
                  >
                    {year}
                  </text>
                </g>
              );
            })}

            {/* ---- marker horizons ----------------------------------------- */}
            {DEADLINES.filter((d) => d.effect !== 'deprecated').map((deadline, i) => {
              const x = scale(deadline.year);
              const milestone = deadline.effect === 'milestone';
              const flip = x > plotWidth - 180;
              return (
                <g
                  key={deadline.id}
                  style={
                    reduced
                      ? undefined
                      : { animation: `tl-horizon 420ms var(--ease-out) ${700 + i * 90}ms both` }
                  }
                >
                  <line
                    x1={x}
                    y1={RULER_H - 7}
                    x2={x}
                    y2={height - VOID_H}
                    stroke={milestone ? 'var(--c-rule-strong)' : 'var(--c-amber)'}
                    strokeWidth={milestone ? 1 : 1.5}
                    strokeDasharray={milestone ? '3 3' : undefined}
                  />
                  <text
                    x={x + (flip ? -6 : 6)}
                    y={RULER_H + 13}
                    textAnchor={flip ? 'end' : 'start'}
                    className="t-data"
                    fontSize="9"
                    letterSpacing="0.1em"
                    fill={milestone ? 'var(--c-ink-faint)' : 'var(--c-amber)'}
                  >
                    {deadline.label}
                  </text>
                </g>
              );
            })}

            {/* ---- the present --------------------------------------------- */}
            <line
              x1={scale(analysisYear)}
              y1={RULER_H - 7}
              x2={scale(analysisYear)}
              y2={height - VOID_H}
              stroke="var(--c-ink-dim)"
              strokeDasharray="2 3"
            />
            <text
              x={scale(analysisYear) - 6}
              y={RULER_H + 13}
              textAnchor="end"
              className="t-data"
              fontSize="9"
              letterSpacing="0.1em"
              fill="var(--c-ink-muted)"
            >
              NOW
            </text>

            {/* ---- lane rules and empty-lane notes -------------------------- */}
            {lanes.map((lane, index) => {
              const top = RULER_H + index * LANE_H;
              const count = placed.filter((p) => p.finding.threatClass === lane.id).length;
              const total = analysis.findings.filter((f) => f.threatClass === lane.id).length;
              const note = emptyLaneNote(lane.id, notScored, noDeadline);
              return (
                <g key={lane.id}>
                  <line
                    x1={0}
                    y1={top + LANE_H - 0.5}
                    x2={plotWidth}
                    y2={top + LANE_H - 0.5}
                    stroke="var(--c-rule-faint)"
                  />
                  {count === 0 && total > 0 ? (
                    <>
                      <rect
                        x={8}
                        y={top + LANE_H / 2 - 8}
                        width={note.length * 6.05 + 12}
                        height={16}
                        fill="var(--c-ground)"
                      />
                      <text
                        x={14}
                        y={top + LANE_H / 2 + 3}
                        className="t-data"
                        fontSize="10"
                        fill="var(--c-ink-faint)"
                      >
                        {note}
                      </text>
                    </>
                  ) : null}
                </g>
              );
            })}

            {/* ---- cluster counts ------------------------------------------ */}
            {clusters
              .filter((cluster) => cluster.findings.length > 1)
              .map((cluster) => {
                const cx = scale(cluster.year);
                const top = RULER_H + cluster.laneIndex * LANE_H;
                const y =
                  top + LANE_H - 12 - Math.min(cluster.findings.length, MAX_STACK) * CELL - 4;
                const label = String(cluster.findings.length);
                return (
                  <g
                    key={`n-${cluster.laneIndex}-${cluster.year}`}
                    style={
                      reduced
                        ? undefined
                        : { animation: 'tl-void 400ms var(--ease-out) 1200ms both' }
                    }
                  >
                    <rect
                      x={cx - label.length * 3.6 - 3}
                      y={y - 10}
                      width={label.length * 7.2 + 6}
                      height={13}
                      fill="var(--c-ground)"
                    />
                    <text
                      x={cx}
                      y={y}
                      textAnchor="middle"
                      className="t-data"
                      fontSize="11"
                      fill="var(--c-ink-dim)"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

            {/* ---- findings ------------------------------------------------- */}
            {placed.map((node) => {
              const selected = selectedId === node.finding.id;
              const dimmed = hovered && hovered.finding.id !== node.finding.id;
              return (
                <rect
                  key={node.finding.id}
                  x={node.x}
                  y={node.y}
                  width={NODE}
                  height={NODE}
                  rx={1}
                  fill={node.hollow ? 'var(--c-bed-1)' : hatchFill(node.finding.severity)}
                  stroke={
                    selected || (hovered && hovered.finding.id === node.finding.id)
                      ? 'var(--c-amber)'
                      : SEVERITY_VAR[node.finding.severity]
                  }
                  strokeWidth={selected ? 2 : 1}
                  strokeDasharray={node.hollow ? '2 1.5' : undefined}
                  className="cursor-pointer"
                  opacity={dimmed ? 0.35 : 1}
                  tabIndex={0}
                  role="button"
                  aria-label={`${node.finding.asset.algorithm} on ${node.finding.asset.name}, ${node.finding.severity}`}
                  onMouseEnter={() => setHovered(node)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(node)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect(node.finding.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(node.finding.id);
                    }
                  }}
                  style={
                    reduced
                      ? undefined
                      : { animation: `tl-node 320ms var(--ease-out) ${1000 + node.order * 7}ms both` }
                  }
                />
              );
            })}

            {/* ---- OFF AXIS -------------------------------------------------
                Two intervals, drawn to scale against each other, because they
                say different things. NOT SCORED is the core that did not come
                back. NO DEADLINE is material that was recovered intact but
                that no published instrument governs. Merging them would
                report a coverage failure where there is none.              */}
            <g
              style={reduced ? undefined : { animation: 'tl-void 500ms var(--ease-out) 1150ms both' }}
            >
              {offAxisBands(notScored.length, noDeadline.length).map((band, i, all) => {
                const totalOff = all.reduce((sum, b) => sum + b.count, 0) || 1;
                const before = all.slice(0, i).reduce((sum, b) => sum + b.count, 0);
                const x = (before / totalOff) * plotWidth;
                const w = (band.count / totalOff) * plotWidth;
                const full = `${band.count} ${band.label} · ${band.caption}`;
                const short = `${band.count} ${band.label}`;
                const fits = w > full.length * 6.4 + 24;
                const text = fits ? full : short;
                return (
                  <g key={band.key}>
                    <rect
                      x={x}
                      y={height - VOID_H + 10}
                      width={w}
                      height={VOID_H - 20}
                      fill={band.fill}
                    />
                    <rect
                      x={x}
                      y={height - VOID_H + 10}
                      width={w}
                      height={VOID_H - 20}
                      fill="none"
                      stroke={band.stroke}
                      strokeDasharray="3 3"
                    />
                    {w > 120 ? (
                      <>
                        <rect
                          x={x + 6}
                          y={height - VOID_H + 17}
                          width={Math.min(w - 12, text.length * 6.4 + 12)}
                          height={15}
                          fill="var(--c-ground)"
                        />
                        <text
                          x={x + 11}
                          y={height - VOID_H + 28}
                          className="t-data"
                          fontSize="11"
                          fill={band.stroke}
                        >
                          {text}
                        </text>
                      </>
                    ) : null}
                  </g>
                );
              })}
            </g>

            <style>{`
              @keyframes tl-draw { from { stroke-dashoffset: ${plotWidth} } to { stroke-dashoffset: 0 } }
              @keyframes tl-horizon { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: none } }
              @keyframes tl-node { from { opacity: 0; transform: translateY(3px) } to { opacity: 1; transform: none } }
              @keyframes tl-void { from { opacity: 0 } to { opacity: 1 } }
            `}</style>
          </svg>
        ) : (
          <div style={{ height }} />
        )}

        {hovered ? (
          <div
            className="pointer-events-none absolute z-toast w-[22rem]"
            style={{
              left: Math.min(Math.max(4, hovered.x - 168), Math.max(4, plotWidth - 356)),
              top: hovered.y + 18,
            }}
          >
            <FindingCard finding={hovered.finding} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function offAxisBands(notScored: number, noDeadline: number) {
  return [
    {
      key: 'not-scored',
      label: 'NOT SCORED',
      caption: 'a required input was absent',
      count: notScored,
      fill: 'url(#hx-unknown)',
      stroke: 'var(--c-unknown)',
    },
    {
      key: 'no-deadline',
      label: 'NO DEADLINE',
      caption: 'assessed, but no instrument sets a date',
      count: noDeadline,
      fill: 'url(#hx-partial)',
      stroke: 'var(--c-ink-muted)',
    },
  ].filter((b) => b.count > 0);
}

/**
 * Two passes: bin the findings so a cluster's width is known, then place each
 * block so the group sits centred on its year. Blocks stack upward from the
 * lane baseline and wrap into a new column every MAX_STACK, which is what
 * gives a heavy year its visible thickness — the bed is thicker where more of
 * the estate has to be cut in that year.
 */
function place(
  analysis: AnalysisResult,
  lanes: { id: ThreatClass }[],
  scale: (year: number) => number,
  plotWidth: number,
): {
  clusters: Cluster[];
  placed: PlacedNode[];
  notScored: Finding[];
  noDeadline: Finding[];
} {
  const notScored: Finding[] = [];
  const noDeadline: Finding[] = [];
  if (plotWidth <= 0) {
    return { clusters: [], placed: [], notScored: analysis.findings, noDeadline };
  }

  const laneIndex = new Map(lanes.map((l, i) => [l.id, i]));
  const bins = new Map<string, Cluster>();

  // Critical first, so the entrance resolves in severity order and the eye
  // lands on the worst material first.
  const ordered = [...analysis.findings].sort(
    (a, b) => (b.urgencyScore ?? -1) - (a.urgencyScore ?? -1) || a.id.localeCompare(b.id),
  );

  for (const finding of ordered) {
    const index = laneIndex.get(finding.threatClass);
    const deadlineYear = finding.anchor?.deadline.year ?? null;

    if (finding.urgencyScore === null) {
      notScored.push(finding);
      continue;
    }
    if (index === undefined || deadlineYear === null) {
      noDeadline.push(finding);
      continue;
    }

    const effort = finding.mosca.migrationYears;
    const startYear = effort !== null ? Math.round(deadlineYear - effort - 0.25) : deadlineYear;
    const year = clamp(startYear, TIMELINE_START, TIMELINE_END);
    const key = `${index}:${year}`;
    const cluster = bins.get(key) ?? { laneIndex: index, year, findings: [], columns: 0 };
    cluster.findings.push(finding);
    bins.set(key, cluster);
  }

  const clusters = [...bins.values()];
  for (const cluster of clusters) {
    cluster.columns = Math.ceil(cluster.findings.length / MAX_STACK);
  }

  const placed: PlacedNode[] = [];
  let order = 0;
  for (const cluster of clusters) {
    const groupW = cluster.columns * CELL - NODE_GAP;
    const left = scale(cluster.year) - groupW / 2;
    const baseline = RULER_H + cluster.laneIndex * LANE_H + LANE_H - 12;

    cluster.findings.forEach((finding, seat) => {
      const column = Math.floor(seat / MAX_STACK);
      const row = seat % MAX_STACK;
      placed.push({
        finding,
        x: left + column * CELL,
        y: baseline - (row + 1) * CELL,
        hollow: finding.mosca.migrationYears === null,
        order: order++,
      });
    });
  }

  return { clusters, placed, notScored, noDeadline };
}

/**
 * Why a lane is empty, said accurately.
 *
 * "No published deadline governs this class" is true of symmetric and hash and
 * false of key establishment, which has a 2030 mandate and is empty only
 * because nothing in it could be scored. Printing the same sentence under both
 * would tell an operator that their RSA population is out of scope, which is
 * the most damaging thing this screen could say.
 */
function emptyLaneNote(
  laneId: ThreatClass,
  notScored: Finding[],
  noDeadline: Finding[],
): string {
  const unscored = notScored.filter((f) => f.threatClass === laneId).length;
  const undated = noDeadline.filter((f) => f.threatClass === laneId).length;

  if (unscored > 0 && undated > 0) {
    return `all off axis · ${unscored} not scored, ${undated} governed by no deadline`;
  }
  if (unscored > 0) {
    return `all ${unscored} off axis · not scored, so no start year can be derived`;
  }
  return `all ${undated} off axis · no published deadline governs this class`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
