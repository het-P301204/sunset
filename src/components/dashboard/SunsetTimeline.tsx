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
   ========================================================================= */

const LANES: { id: ThreatClass; label: string }[] = [
  { id: 'key-establishment', label: 'KEY ESTABLISHMENT' },
  { id: 'signature', label: 'SIGNATURE' },
  { id: 'symmetric', label: 'SYMMETRIC' },
  { id: 'hash', label: 'HASH' },
];

const PAD_LEFT = 128;
const PAD_RIGHT = 24;
const RULER_HEIGHT = 34;
const LANE_HEIGHT = 62;
const VOID_HEIGHT = 44;
const NODE = 6;
const NODE_GAP = 1.5;
const MAX_STACK = 6;

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
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const [hovered, setHovered] = useState<PlacedNode | null>(null);
  const reduced = useReducedMotion();

  const lanes = compact ? LANES.slice(0, 2) : LANES;
  const height = RULER_HEIGHT + lanes.length * LANE_HEIGHT + VOID_HEIGHT;
  const plotWidth = Math.max(240, width - PAD_LEFT - PAD_RIGHT);
  const scale = (year: number) =>
    PAD_LEFT +
    ((clamp(year, TIMELINE_START, TIMELINE_END) - TIMELINE_START) /
      (TIMELINE_END - TIMELINE_START)) *
      plotWidth;

  const analysisYear = new Date(analysis.analysedAt).getUTCFullYear();

  const { placed, notScored, noDeadline } = useMemo(
    () => placeFindings(analysis, lanes, scale, width),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis, width, compact],
  );
  const offAxis = notScored.length + noDeadline.length;

  const years: number[] = [];
  for (let y = TIMELINE_START; y <= TIMELINE_END; y += 1) years.push(y);

  return (
    // Below roughly a tablet the column cannot hold ten year labels and four
    // lane names without collapsing into overlap. It keeps its proportions and
    // scrolls instead: squeezing a time axis until the years touch is worse
    // than asking for a swipe.
    <div className="w-full overflow-x-auto">
      <div ref={ref} className="relative min-w-[780px] select-none">
        {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Migration timeline from ${TIMELINE_START} to ${TIMELINE_END}. ${placed.length} findings plotted by the year their migration must start. ${notScored.length} could not be scored and ${noDeadline.length} are governed by no published deadline, so neither group has a position on this axis.`}
          className="block overflow-visible"
        >
          {/* ---- year ruler ------------------------------------------------ */}
          <g>
            <line
              x1={PAD_LEFT}
              y1={RULER_HEIGHT - 0.5}
              x2={PAD_LEFT + plotWidth}
              y2={RULER_HEIGHT - 0.5}
              stroke="var(--c-rule-strong)"
              strokeWidth="1"
              style={
                reduced
                  ? undefined
                  : {
                      strokeDasharray: plotWidth,
                      strokeDashoffset: 0,
                      animation: `tl-draw 700ms var(--ease-out) both`,
                    }
              }
            />
            {years.map((year) => {
              const x = scale(year);
              const isNow = year === analysisYear;
              return (
                <g key={year}>
                  <line
                    x1={x}
                    y1={RULER_HEIGHT - 6}
                    x2={x}
                    y2={RULER_HEIGHT}
                    stroke="var(--c-rule-strong)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={RULER_HEIGHT - 12}
                    textAnchor="middle"
                    className="t-data"
                    fontSize="10"
                    letterSpacing="0.06em"
                    fill={isNow ? 'var(--c-ink-dim)' : 'var(--c-ink-faint)'}
                  >
                    {year}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ---- marker horizons ------------------------------------------- */}
          {DEADLINES.filter((d) => d.effect !== 'deprecated').map((deadline, i) => {
            const x = scale(deadline.year);
            const milestone = deadline.effect === 'milestone';
            const flip = x > width - 170;
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
                  y1={RULER_HEIGHT - 6}
                  x2={x}
                  y2={height - VOID_HEIGHT}
                  stroke={milestone ? 'var(--c-rule-strong)' : 'var(--c-amber)'}
                  strokeWidth={milestone ? 1 : 1.5}
                  strokeDasharray={milestone ? '3 3' : undefined}
                  opacity={milestone ? 0.8 : 0.9}
                />
                {/* The last horizon sits on the right edge, so its label reads
                    back into the plot rather than off the end of it. */}
                <text
                  x={x + (flip ? -5 : 5)}
                  y={RULER_HEIGHT + 11}
                  textAnchor={flip ? 'end' : 'start'}
                  className="t-data"
                  fontSize="9"
                  letterSpacing="0.12em"
                  fill={milestone ? 'var(--c-ink-faint)' : 'var(--c-amber)'}
                >
                  {deadline.label}
                </text>
              </g>
            );
          })}

          {/* ---- the present -------------------------------------------- */}
          <g>
            <line
              x1={scale(analysisYear)}
              y1={RULER_HEIGHT - 6}
              x2={scale(analysisYear)}
              y2={height - VOID_HEIGHT}
              stroke="var(--c-ink-dim)"
              strokeWidth="1"
              strokeDasharray="1 3"
              opacity="0.5"
            />
            <text
              x={scale(analysisYear) - 5}
              y={RULER_HEIGHT + 11}
              textAnchor="end"
              className="t-data"
              fontSize="9"
              letterSpacing="0.1em"
              fill="var(--c-ink-muted)"
            >
              NOW
            </text>
          </g>

          {/* ---- lanes ------------------------------------------------------ */}
          {lanes.map((lane, index) => {
            const top = RULER_HEIGHT + index * LANE_HEIGHT;
            const count = placed.filter((p) => p.finding.threatClass === lane.id).length;
            const total = analysis.findings.filter((f) => f.threatClass === lane.id).length;
            return (
              <g key={lane.id}>
                <line
                  x1={0}
                  y1={top + LANE_HEIGHT - 0.5}
                  x2={width}
                  y2={top + LANE_HEIGHT - 0.5}
                  stroke="var(--c-rule-faint)"
                  strokeWidth="1"
                />
                <text
                  x={0}
                  y={top + LANE_HEIGHT - 27}
                  className="t-data"
                  fontSize="9"
                  letterSpacing="0.12em"
                  fill="var(--c-ink-muted)"
                >
                  {lane.label}
                </text>
                {/* Per-class recovery, the way a driller's log records it run
                    by run rather than only as one figure for the hole. The bar
                    is the fraction of this class that made it onto the axis;
                    the rest is drawn in the OFF AXIS band below. */}
                <text
                  x={0}
                  y={top + LANE_HEIGHT - 27}
                  className="t-data"
                  fontSize="10"
                  fill="var(--c-ink-faint)"
                  textAnchor="start"
                  dx={PAD_LEFT - 30}
                >
                  {total === 0 ? '' : `${Math.round((count / total) * 100)}%`}
                </text>
                <rect
                  x={0}
                  y={top + LANE_HEIGHT - 19}
                  width={PAD_LEFT - 20}
                  height={3}
                  fill="var(--c-bed-2)"
                />
                <rect
                  x={0}
                  y={top + LANE_HEIGHT - 19}
                  width={total === 0 ? 0 : ((PAD_LEFT - 20) * count) / total}
                  height={3}
                  fill="var(--c-ink-muted)"
                />
                <text
                  x={0}
                  y={top + LANE_HEIGHT - 7}
                  className="t-data"
                  fontSize="9"
                  fill="var(--c-ink-faint)"
                >
                  {count} of {total} on axis
                </text>
                {count === 0 && total > 0 ? (
                  <>
                    <rect
                      x={PAD_LEFT + 4}
                      y={top + LANE_HEIGHT / 2 - 7}
                      width={emptyLaneNote(lane.id, notScored, noDeadline).length * 6.05 + 10}
                      height={14}
                      fill="var(--c-ground)"
                    />
                    <text
                      x={PAD_LEFT + 8}
                      y={top + LANE_HEIGHT / 2 + 3}
                      className="t-data"
                      fontSize="10"
                      fill="var(--c-ink-faint)"
                    >
                      {emptyLaneNote(lane.id, notScored, noDeadline)}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}

          {/* ---- findings --------------------------------------------------- */}
          <g>
            {placed.map((node) => {
              const selected = selectedId === node.finding.id;
              return (
                <rect
                  key={node.finding.id}
                  x={node.x}
                  y={node.y}
                  width={NODE}
                  height={NODE}
                  fill={node.hollow ? 'transparent' : hatchFill(node.finding.severity)}
                  stroke={SEVERITY_VAR[node.finding.severity]}
                  strokeWidth={selected ? 1.6 : node.hollow ? 1 : 0.8}
                  strokeDasharray={node.hollow ? '1.5 1' : undefined}
                  className="cursor-pointer transition-opacity duration-fast"
                  opacity={hovered && hovered.finding.id !== node.finding.id ? 0.45 : 1}
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
                      : {
                          animation: `tl-node 320ms var(--ease-out) ${1000 + node.order * 7}ms both`,
                        }
                  }
                />
              );
            })}
          </g>

          {/* ---- OFF-AXIS ---------------------------------------------------
              Two intervals, drawn to scale against each other, because they say
              different things. NOT SCORED is the core that did not come back.
              NO DEADLINE is material that was recovered intact but that no
              published instrument governs, so it has no date to be plotted at.
              Merging them into one band would report a coverage failure where
              there is none.                                                  */}
          <g
            style={
              reduced ? undefined : { animation: 'tl-void 500ms var(--ease-out) 1150ms both' }
            }
          >
            {[
              {
                key: 'not-scored',
                label: 'NOT SCORED',
                count: notScored.length,
                fill: 'url(#hx-unknown)',
                stroke: 'var(--c-unknown)',
                caption: 'a required input was absent',
              },
              {
                key: 'no-deadline',
                label: 'NO DEADLINE',
                count: noDeadline.length,
                fill: 'url(#hx-partial)',
                stroke: 'var(--c-ink-muted)',
                caption: 'assessed, but no instrument sets a date',
              },
            ]
              .filter((band) => band.count > 0)
              .map((band, i, all) => {
                const totalOff = all.reduce((sum, b) => sum + b.count, 0) || 1;
                const before = all.slice(0, i).reduce((sum, b) => sum + b.count, 0);
                const x = PAD_LEFT + (before / totalOff) * plotWidth;
                const w = (band.count / totalOff) * plotWidth;
                return (
                  <g key={band.key}>
                    <rect
                      x={x}
                      y={height - VOID_HEIGHT + 8}
                      width={w}
                      height={VOID_HEIGHT - 18}
                      fill={band.fill}
                    />
                    <rect
                      x={x}
                      y={height - VOID_HEIGHT + 8}
                      width={w}
                      height={VOID_HEIGHT - 18}
                      fill="none"
                      stroke={band.stroke}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.75"
                    />
                    {w > 150 ? (
                      <>
                        {/* The label sits on top of a hatch, so it gets its own
                            ground. Reading text straight off a ruling is how a
                            log sheet becomes unreadable at the one place the
                            reader most needs it. */}
                        <rect
                          x={x + 4}
                          y={height - VOID_HEIGHT + 15}
                          width={Math.min(
                            w - 8,
                            `${band.count} ${band.label} · ${band.caption}`.length * 6.05 + 14,
                          )}
                          height={14}
                          fill="var(--c-ground)"
                        />
                        <text
                          x={x + 8}
                          y={height - VOID_HEIGHT + 25}
                          className="t-data"
                          fontSize="10"
                          fill={band.stroke}
                        >
                          {band.count} {band.label}
                          <tspan fill="var(--c-ink-faint)"> &#183; {band.caption}</tspan>
                        </text>
                      </>
                    ) : (
                      <text
                        x={x + 6}
                        y={height - VOID_HEIGHT + 25}
                        className="t-data"
                        fontSize="10"
                        fill={band.stroke}
                      >
                        {band.count}
                      </text>
                    )}
                  </g>
                );
              })}
            <text
              x={0}
              y={height - VOID_HEIGHT + 20}
              className="t-data"
              fontSize="9"
              letterSpacing="0.12em"
              fill="var(--c-unknown)"
            >
              OFF AXIS
            </text>
            <text
              x={0}
              y={height - VOID_HEIGHT + 32}
              className="t-data"
              fontSize="10"
              fill="var(--c-ink-faint)"
            >
              {offAxis}
            </text>
          </g>

          <style>{`
            @keyframes tl-draw { from { stroke-dashoffset: ${plotWidth} } to { stroke-dashoffset: 0 } }
            @keyframes tl-horizon { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: none } }
            @keyframes tl-node { from { opacity: 0; transform: translateY(3px) } to { opacity: 1; transform: none } }
            @keyframes tl-void { from { opacity: 0 } to { opacity: 1 } }
          `}</style>
        </svg>
        ) : (
          <div className="h-[280px]" />
        )}

        {hovered ? (
          <div
            className="pointer-events-none absolute z-toast w-[22rem]"
            style={{
              left: Math.min(Math.max(8, hovered.x - 168), Math.max(8, width - 360)),
              top: hovered.y + 14,
            }}
          >
            <FindingCard finding={hovered.finding} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Places every finding that has a position, and returns the rest untouched.
 * Nodes stack upward from each lane's baseline in columns, which is what gives
 * a dense year its visible thickness — the bed is thicker where more of the
 * estate has to be cut in that year.
 */
function placeFindings(
  analysis: AnalysisResult,
  lanes: { id: ThreatClass }[],
  scale: (year: number) => number,
  width: number,
): { placed: PlacedNode[]; notScored: Finding[]; noDeadline: Finding[] } {
  const placed: PlacedNode[] = [];
  const notScored: Finding[] = [];
  const noDeadline: Finding[] = [];
  if (width <= 0) return { placed, notScored: analysis.findings, noDeadline };

  const laneIndex = new Map(lanes.map((l, i) => [l.id, i]));
  const bins = new Map<string, number>();

  // Critical first, so the entrance animation resolves in severity order and
  // the operator's eye lands on the worst material first.
  const ordered = [...analysis.findings].sort(
    (a, b) => (b.urgencyScore ?? -1) - (a.urgencyScore ?? -1) || a.id.localeCompare(b.id),
  );

  ordered.forEach((finding, order) => {
    const index = laneIndex.get(finding.threatClass);
    const deadlineYear = finding.anchor?.deadline.year ?? null;

    if (finding.urgencyScore === null) {
      notScored.push(finding);
      return;
    }
    if (index === undefined || deadlineYear === null) {
      noDeadline.push(finding);
      return;
    }

    const effort = finding.mosca.migrationYears;
    const startYear =
      effort !== null ? Math.round(deadlineYear - effort - 0.25) : deadlineYear;
    const binYear = clamp(startYear, TIMELINE_START, TIMELINE_END);
    const key = `${finding.threatClass}:${binYear}`;
    const seat = bins.get(key) ?? 0;
    bins.set(key, seat + 1);

    const column = Math.floor(seat / MAX_STACK);
    const row = seat % MAX_STACK;
    const baseline = RULER_HEIGHT + index * LANE_HEIGHT + LANE_HEIGHT - 8;

    placed.push({
      finding,
      x: scale(binYear) - NODE / 2 + column * (NODE + NODE_GAP) - 1,
      y: baseline - (row + 1) * (NODE + NODE_GAP),
      hollow: effort === null,
      order,
    });
  });

  return { placed, notScored, noDeadline };
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
