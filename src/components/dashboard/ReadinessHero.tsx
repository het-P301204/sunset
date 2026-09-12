import type { AnalysisResult, Severity } from '@/types/domain';
import { countBySeverity } from '@/state/selectors';
import { useCountUp } from '@/hooks/useCountUp';
import { SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';
import { Tooltip } from '@/components/shared/Primitives';

/* ============================================================================
   MIGRATION READINESS

   Not a KPI row. The figures are the structure: four monumental numerals on a
   shared baseline, separated by hairlines, with the core-recovery bar ruled
   underneath them at full width.

   The bar is the argument. ASSESSED, PARTIALLY ASSESSED and NO RECOVERY are
   drawn to scale on one line, so the proportion of the inventory this whole
   application is silent about is the same size on screen as it is in reality.
   Every other number here is only true of the part that was recovered.
   ========================================================================= */

export function ReadinessHero({
  analysis,
  onDrill,
}: {
  analysis: AnalysisResult;
  onDrill: (kind: 'critical' | 'high' | 'unknown' | 'coverage') => void;
}) {
  const counts = countBySeverity(analysis.findings);
  const { coverage } = analysis;
  const assessedPct = Math.round(coverage.assessedRatio * 100);

  return (
    <section aria-labelledby="readiness-head" className="border-b border-rule">
      <h2 id="readiness-head" className="sr-only">
        Migration readiness
      </h2>

      <div className="grid grid-cols-2 border-b border-rule-faint lg:grid-cols-4">
        <Figure
          value={assessedPct}
          suffix="%"
          label="ASSESSED"
          note={`${coverage.assessed} of ${coverage.total} findings have every scoring input`}
          onClick={() => onDrill('coverage')}
          delay={0}
        />
        <Figure
          value={counts.critical}
          label="CRITICAL"
          severity="critical"
          note="Score 70 or above"
          onClick={() => onDrill('critical')}
          delay={90}
        />
        <Figure
          value={counts.high}
          label="HIGH"
          severity="high"
          note="Score 50 to 69"
          onClick={() => onDrill('high')}
          delay={180}
        />
        <Figure
          value={counts.unknown}
          label="UNKNOWN"
          severity="unknown"
          note="Not scored: a required input was absent"
          onClick={() => onDrill('unknown')}
          delay={270}
          emphasis
        />
      </div>

      <RecoveryBar analysis={analysis} onDrill={() => onDrill('coverage')} />
    </section>
  );
}

function Figure({
  value,
  suffix,
  label,
  note,
  severity,
  onClick,
  delay,
  emphasis,
}: {
  value: number;
  suffix?: string;
  label: string;
  note: string;
  severity?: Severity;
  onClick: () => void;
  delay: number;
  emphasis?: boolean;
}) {
  const counted = useCountUp(value, 620, delay);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-start gap-1 border-r border-rule-faint px-5 py-5 text-left transition-colors duration-fast ease-out last:border-r-0 hover:bg-bed-1 lg:px-6 lg:py-6"
    >
      <div className="flex items-center gap-2">
        {severity ? <SeverityMark severity={severity} size={9} /> : null}
        <span className="t-label">{label}</span>
      </div>
      <div
        className="t-data font-light leading-[0.85] text-[clamp(2.75rem,5.5vw,5.25rem)]"
        style={{
          color: emphasis
            ? 'var(--c-unknown)'
            : severity
              ? SEVERITY_VAR[severity]
              : 'var(--c-ink)',
        }}
      >
        {counted}
        {suffix ? <span className="text-ink-faint">{suffix}</span> : null}
      </div>
      <p className="mt-1 text-xs leading-[15px] text-ink-muted">{note}</p>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-0 bg-amber transition-all duration-base ease-out group-hover:w-full"
      />
    </button>
  );
}

/**
 * The core-recovery bar. One line, three intervals, drawn to scale, each
 * labelled with its own percentage the way a driller's log records recovery
 * per run.
 */
function RecoveryBar({
  analysis,
  onDrill,
}: {
  analysis: AnalysisResult;
  onDrill: () => void;
}) {
  const { coverage } = analysis;
  const total = Math.max(1, coverage.total);
  const segments = [
    {
      key: 'assessed',
      label: 'ASSESSED',
      count: coverage.assessed,
      fill: 'url(#hx-assessed)',
      stroke: 'var(--c-ink-dim)',
      text: 'var(--c-ink-dim)',
      help: 'Every input the scoring model needs was present.',
    },
    {
      key: 'partial',
      label: 'PARTIAL',
      count: coverage.partial,
      fill: 'url(#hx-partial)',
      stroke: 'var(--c-ink-muted)',
      text: 'var(--c-ink-muted)',
      help: 'Scored, but at least one non-blocking input was missing. Confidence is reduced.',
    },
    {
      key: 'unknown',
      label: 'NO RECOVERY',
      count: coverage.unknown,
      fill: 'url(#hx-unknown)',
      stroke: 'var(--c-unknown)',
      text: 'var(--c-unknown)',
      help: 'Not scored at all. A blocking input was absent, and the specific field is named on each finding.',
    },
  ].filter((s) => s.count > 0);

  return (
    <div className="px-5 py-4 lg:px-6">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="t-label">CORE RECOVERY</span>
        <span className="text-xs text-ink-muted">
          {coverage.total} cryptographic uses &middot; {analysis.inventory.version}
          {analysis.inventory.producer ? ` · ${analysis.inventory.producer}` : ''}
        </span>
      </div>

      <button
        type="button"
        onClick={onDrill}
        aria-label="Coverage breakdown"
        className="block w-full"
      >
        <div className="flex h-9 w-full overflow-hidden border border-rule">
          {segments.map((segment) => {
            const pct = (segment.count / total) * 100;
            return (
              <div
                key={segment.key}
                className="relative h-full border-r border-rule last:border-r-0"
                style={{ width: `${pct}%` }}
                title={`${segment.label}: ${segment.count} findings, ${pct.toFixed(1)}%`}
              >
                <svg width="100%" height="100%" className="block" aria-hidden="true">
                  <rect width="100%" height="100%" fill={segment.fill} />
                </svg>
              </div>
            );
          })}
        </div>
      </button>

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
        {segments.map((segment) => {
          const pct = (segment.count / total) * 100;
          return (
            <Tooltip key={segment.key} label={segment.label} body={segment.help} side="top">
              <span className="flex cursor-help items-baseline gap-2">
                <span
                  className="t-data text-sm tabular-nums"
                  style={{ color: segment.text }}
                >
                  {pct.toFixed(0)}%
                </span>
                <span className="t-label text-3xs" style={{ color: segment.text }}>
                  {segment.label}
                </span>
                <span className="t-data text-2xs text-ink-faint">{segment.count}</span>
              </span>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
