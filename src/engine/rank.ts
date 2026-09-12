import type { Finding, PlanBucket } from '@/types/domain';

/* ============================================================================
   Ranking and engine-recommended scheduling.

   Two rules give the queue its shape:

   1. A finding with no score is not ranked. It goes to UNKNOWN, not to the
      bottom. Sorting an unassessable asset below a "low" asset would tell the
      operator it is less important, which nobody knows.

   2. Ties break on the binding constraint, not on the name. Two findings at
      the same score are separated by the nearer deadline, then by the longer
      data lifetime, then by identifier so the order is stable across runs.
   ========================================================================= */

export function rankFindings(findings: Finding[]): string[] {
  const scored = findings.filter((f) => f.urgencyScore !== null);

  scored.sort((a, b) => {
    const scoreDelta = (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0);
    if (scoreDelta !== 0) return scoreDelta;

    const aDeadline = a.anchor?.deadline.year ?? Number.POSITIVE_INFINITY;
    const bDeadline = b.anchor?.deadline.year ?? Number.POSITIVE_INFINITY;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    const aLife = a.mosca.dataLifetimeYears ?? -1;
    const bLife = b.mosca.dataLifetimeYears ?? -1;
    if (aLife !== bLife) return bLife - aLife;

    return a.id.localeCompare(b.id);
  });

  scored.forEach((finding, index) => {
    finding.rank = index + 1;
  });
  for (const finding of findings) {
    if (finding.urgencyScore === null) finding.rank = null;
  }

  return scored.map((f) => f.id);
}

/**
 * The bucket the engine recommends. Derived from when the work has to START
 * to finish before the binding date, not from when the date is: a fourteen-
 * month migration due in 2030 starts in 2028, and saying "2030" would be the
 * kind of answer that loses the window.
 */
export function recommendBucket(finding: Finding, analysisYear: number): PlanBucket {
  if (finding.urgencyScore === null) return 'review';
  if (finding.mosca.windowState === 'insufficient') return 'now';
  if (finding.verdict === 'compliant') return 'review';

  const deadlineYear = finding.anchor?.deadline.year ?? null;
  const migrationYears = finding.mosca.migrationYears;

  if (deadlineYear === null) {
    return finding.verdict === 'migrate-now' ? 'now' : 'review';
  }
  if (migrationYears === null) return 'review';

  // Start year = deadline - effort, with a one-quarter buffer so a plan that
  // lands exactly on the deadline is not presented as comfortable.
  const startYear = Math.floor(deadlineYear - migrationYears - 0.25);

  if (startYear <= analysisYear) return 'now';
  if (startYear <= 2027) return '2027';
  if (startYear <= 2028) return '2028';
  if (startYear <= 2029) return '2029';
  if (startYear <= 2030) return '2030';
  return '2031+';
}
