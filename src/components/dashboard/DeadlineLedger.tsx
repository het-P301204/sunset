import { useMemo } from 'react';
import type { AnalysisResult, Deadline, Finding } from '@/types/domain';
import { AUTHORITY_LABEL } from '@/export/report';
import { SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';

/* ============================================================================
   THE DEADLINE LEDGER

   One ruled row per published obligation, which is the unit an operator is
   actually held to. It answers the question the front page most needs to
   answer and that nothing else here answers directly: which date is coming,
   how much time is left against it, and how much of the estate it governs.

   Deliberately NOT a second time axis. The timeline plots when work must
   start; this counts what each instrument is responsible for. Two charts of
   the same shape on one page would be one chart and one decoration.

   The bar is a depletion gauge, not a scale: every row is drawn against the
   furthest obligation, so a short bar means little time rather than little
   importance. The number beside it is the one that matters.
   ========================================================================= */

interface Row {
  deadline: Deadline;
  findings: Finding[];
  yearsRemaining: number;
  insufficient: number;
  critical: number;
  high: number;
  notScored: number;
}

/**
 * Years to an obligation, measured from the analysis date, for instruments no
 * finding is anchored to. They still appear in the ledger.
 */
function yearsTo(deadline: Deadline, analysedAt: string): number {
  const d = new Date(deadline.date).getTime();
  const now = new Date(analysedAt).getTime();
  return Math.round(((d - now) / (365.2425 * 24 * 3600 * 1000)) * 10) / 10;
}

export function DeadlineLedger({
  analysis,
  onSelectDeadline,
}: {
  analysis: AnalysisResult;
  onSelectDeadline: (year: number) => void;
}) {
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const deadline of analysis.deadlines) {
      if (deadline.effect === 'milestone') continue;
      const findings = analysis.findings.filter((f) => f.anchor?.deadline.id === deadline.id);
      // An instrument with no population is still on the record. Dropping the
      // 2035 disallowed date because every finding it covers is already held
      // to an earlier mandate would hide a real obligation from a reader who
      // came to this page to find out what the dates are.
      if (findings.length === 0) {
        out.push({
          deadline,
          findings,
          yearsRemaining: yearsTo(deadline, analysis.analysedAt),
          insufficient: 0,
          critical: 0,
          high: 0,
          notScored: 0,
        });
        continue;
      }
      out.push({
        deadline,
        findings,
        yearsRemaining: findings[0]!.anchor!.yearsRemaining,
        insufficient: findings.filter((f) => f.mosca.windowState === 'insufficient').length,
        critical: findings.filter((f) => f.severity === 'critical').length,
        high: findings.filter((f) => f.severity === 'high').length,
        notScored: findings.filter((f) => f.urgencyScore === null).length,
      });
    }
    return out.sort((a, b) => a.yearsRemaining - b.yearsRemaining);
  }, [analysis]);

  const longest = Math.max(...rows.map((r) => r.yearsRemaining), 1);

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-ink-muted lg:px-6">
        No finding in this inventory is governed by a published obligation. Either nothing here is
        quantum-vulnerable, or nothing could be classified well enough to anchor.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-rule-faint border-y border-rule-faint">
      {rows.map((row) => {
        const urgent = row.yearsRemaining < 5;
        const governs = row.findings.length > 0;
        return (
          <li key={row.deadline.id}>
            <button
              type="button"
              onClick={() => governs && onSelectDeadline(row.deadline.year)}
              disabled={!governs}
              className={`group grid w-full grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-5 px-4 py-4 text-left transition-colors duration-fast ease-out lg:grid-cols-[4.5rem_minmax(0,1.4fr)_minmax(11rem,0.9fr)_minmax(9rem,0.7fr)] lg:px-6 ${
                governs ? 'hover:bg-bed-1' : 'cursor-default opacity-60'
              }`}
            >
              <span
                className="t-data text-2xl font-light leading-none"
                style={{ color: urgent ? 'var(--c-amber)' : 'var(--c-ink-dim)' }}
              >
                {row.deadline.year}
              </span>

              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="t-section text-ink">{row.deadline.label}</span>
                  <span className="t-data text-3xs uppercase tracking-[0.08em] text-ink-muted">
                    {AUTHORITY_LABEL[row.deadline.authority] ?? row.deadline.authority}
                  </span>
                  <span className="t-data text-3xs uppercase tracking-[0.08em] text-ink-faint">
                    {row.deadline.effect}
                  </span>
                </span>
                <p className="mt-1 text-sm leading-[18px] text-ink-muted measure">
                  {row.deadline.clause}
                </p>
              </span>

              {/* --- the gauge ------------------------------------------------ */}
              <span className="col-start-2 mt-3 lg:col-start-3 lg:mt-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="t-label text-3xs">TIME REMAINING</span>
                  <span
                    className="t-data text-sm"
                    style={{ color: urgent ? 'var(--c-amber)' : 'var(--c-ink-dim)' }}
                  >
                    {row.yearsRemaining.toFixed(1)}
                    <span className="text-ink-faint"> years</span>
                  </span>
                </span>
                <span className="mt-1.5 flex h-2.5 w-full overflow-hidden border border-rule">
                  <span
                    className="block h-full"
                    style={{
                      width: `${(row.yearsRemaining / longest) * 100}%`,
                      background: urgent ? 'var(--c-amber)' : 'var(--c-ink-muted)',
                      opacity: urgent ? 0.9 : 0.75,
                    }}
                  />
                </span>
                {!governs ? (
                  <span className="mt-1.5 block text-3xs text-ink-faint">
                    on the record, but nothing is anchored to it
                  </span>
                ) : row.insufficient > 0 ? (
                  <span className="mt-1.5 flex items-center gap-1.5">
                    <span className="t-data text-xs text-risk-critical">{row.insufficient}</span>
                    <span className="text-3xs text-ink-muted">
                      cannot be migrated in the time left
                    </span>
                  </span>
                ) : (
                  <span className="mt-1.5 block text-3xs text-ink-faint">
                    every scored finding here has a reachable window
                  </span>
                )}
              </span>

              {/* --- the population ------------------------------------------- */}
              <span className="col-start-2 mt-3 lg:col-start-4 lg:mt-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="t-label text-3xs">GOVERNS</span>
                  <span
                    className="t-data text-sm"
                    style={{ color: governs ? 'var(--c-ink)' : 'var(--c-ink-faint)' }}
                  >
                    {row.findings.length}
                  </span>
                </span>
                {governs ? (
                  <span className="mt-1.5 flex flex-col gap-1">
                    <Tally severity="critical" count={row.critical} />
                    <Tally severity="high" count={row.high} />
                    <Tally severity="unknown" count={row.notScored} label="not scored" />
                  </span>
                ) : (
                  <span className="mt-1.5 block text-3xs leading-[14px] text-ink-faint">
                    every finding it would cover is already held to an earlier mandate
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Tally({
  severity,
  count,
  label,
}: {
  severity: 'critical' | 'high' | 'unknown';
  count: number;
  label?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <SeverityMark severity={severity} size={8} />
      <span
        className="t-data w-6 text-xs"
        style={{ color: count === 0 ? 'var(--c-ink-faint)' : SEVERITY_VAR[severity] }}
      >
        {count}
      </span>
      <span className="text-3xs uppercase tracking-[0.08em] text-ink-muted">
        {label ?? severity}
      </span>
    </span>
  );
}
