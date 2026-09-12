import type {
  AnalysisResult,
  Coverage,
  Finding,
  FilterState,
  PlanBucket,
  PlanEntry,
  Severity,
  SortState,
  ThreatClass,
} from '@/types/domain';
import { coverageStateOf } from '@/engine/coverage';

/* ============================================================================
   Derivations.

   Pure functions over an AnalysisResult. Components call these; they never
   filter or sort inline. Keeping it here means the inventory table, the
   timeline, the report and the simulation all agree about what "the current
   selection" is, and there is one place to fix when they do not.
   ========================================================================= */

export function filterFindings(findings: Finding[], filters: FilterState): Finding[] {
  const query = filters.query.trim().toLowerCase();
  const terms = query ? query.split(/\s+/) : [];

  return findings.filter((finding) => {
    if (filters.threatClasses.length && !filters.threatClasses.includes(finding.threatClass)) {
      return false;
    }
    if (filters.severities.length && !filters.severities.includes(finding.severity)) return false;
    if (filters.agilities.length && !filters.agilities.includes(finding.agility.grade)) {
      return false;
    }
    if (filters.confidences.length && !filters.confidences.includes(finding.confidence)) {
      return false;
    }
    if (filters.deadlineYears.length) {
      const year = finding.anchor?.deadline.year;
      if (year === undefined || !filters.deadlineYears.includes(year)) return false;
    }
    if (filters.sourceKinds.length && !filters.sourceKinds.includes(finding.asset.source.kind)) {
      return false;
    }
    if (filters.onlyHndl && !finding.hndl) return false;
    if (filters.onlyUnknown && finding.urgencyScore !== null) return false;

    if (terms.length) {
      const haystack = searchText(finding);
      for (const term of terms) if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

function searchText(finding: Finding): string {
  return [
    finding.asset.name,
    finding.asset.algorithm,
    finding.asset.rawAlgorithm,
    finding.asset.protocol ?? '',
    finding.asset.curve ?? '',
    finding.asset.source.locator ?? '',
    finding.asset.source.ref,
    finding.threatClass,
    finding.severity,
    finding.agility.grade,
    finding.asset.certificate?.subject ?? '',
    finding.context?.owner ?? '',
    Object.values(finding.asset.attributes).join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

const CONFIDENCE_ORDER = { high: 3, medium: 2, low: 1, none: 0 } as const;

/** The sortable value for a column, or null where the finding has none. */
function sortValue(finding: Finding, key: SortState['key']): number | string | null {
  switch (key) {
    case 'urgency':
      return finding.urgencyScore;
    case 'deadline':
      return finding.anchor ? finding.anchor.deadline.year : null;
    case 'effort':
      return finding.mosca.migrationYears;
    case 'lifetime':
      return finding.mosca.dataLifetimeYears;
    case 'confidence':
      return CONFIDENCE_ORDER[finding.confidence];
    case 'algorithm':
      return finding.asset.algorithm;
    case 'name':
      return finding.asset.name;
    default:
      return null;
  }
}

export function sortFindings(findings: Finding[], sort: SortState): Finding[] {
  const direction = sort.direction === 'asc' ? 1 : -1;
  const copy = [...findings];

  copy.sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);

    // A finding with no value for this column sinks to the end in BOTH
    // directions. It is not the least urgent thing, it is the unranked thing,
    // and flipping the sort must never promote it to the top as though it were
    // the most urgent. That is why null handling sits outside the direction
    // multiplier rather than inside the comparator.
    if (av === null && bv === null) return a.id.localeCompare(b.id);
    if (av === null) return 1;
    if (bv === null) return -1;

    const delta =
      typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);

    if (delta !== 0) return delta * direction;
    return a.id.localeCompare(b.id);
  });
  return copy;
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    safe: 0,
    unknown: 0,
  };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export function countByThreatClass(findings: Finding[]): Record<ThreatClass, number> {
  const counts: Record<ThreatClass, number> = {
    'key-establishment': 0,
    signature: 0,
    symmetric: 0,
    hash: 0,
    unclassified: 0,
  };
  for (const finding of findings) counts[finding.threatClass] += 1;
  return counts;
}

export interface DeadlineGroup {
  id: string;
  year: number;
  label: string;
  findings: Finding[];
  critical: number;
  high: number;
}

/**
 * Grouped by deadline identity, not by year. Two instruments land on 2030 —
 * the EO 14412 mandate and the NIST IR 8547 deprecation — and grouping by year
 * would report the mandate's population against the deprecation as well,
 * double-counting every key-establishment finding in the estate.
 */
export function groupByDeadline(findings: Finding[]): DeadlineGroup[] {
  const groups = new Map<string, DeadlineGroup>();
  for (const finding of findings) {
    if (!finding.anchor) continue;
    const { id, year, label } = finding.anchor.deadline;
    const group = groups.get(id) ?? { id, year, label, findings: [], critical: 0, high: 0 };
    group.findings.push(finding);
    if (finding.severity === 'critical') group.critical += 1;
    if (finding.severity === 'high') group.high += 1;
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => a.year - b.year);
}

export function rankedFindings(analysis: AnalysisResult): Finding[] {
  const index = new Map(analysis.findings.map((f) => [f.id, f]));
  return analysis.ranking.map((id) => index.get(id)!).filter(Boolean);
}

export function unknownFindings(analysis: AnalysisResult): Finding[] {
  return analysis.findings.filter((f) => coverageStateOf(f) === 'unknown');
}

export function findingById(analysis: AnalysisResult | null, id: string | null): Finding | null {
  if (!analysis || !id) return null;
  return analysis.findings.find((f) => f.id === id) ?? null;
}

/** Coverage recomputed over a filtered subset, for the inventory footer. */
export function subsetCoverage(findings: Finding[]): Pick<
  Coverage,
  'total' | 'assessed' | 'partial' | 'unknown'
> {
  let assessed = 0;
  let partial = 0;
  let unknown = 0;
  for (const finding of findings) {
    const state = coverageStateOf(finding);
    if (state === 'assessed') assessed += 1;
    else if (state === 'partial') partial += 1;
    else unknown += 1;
  }
  return { total: findings.length, assessed, partial, unknown };
}

export interface PlanColumn {
  bucket: PlanBucket;
  label: string;
  entries: { entry: PlanEntry; finding: Finding }[];
  overrides: number;
}

export const BUCKET_LABEL: Record<PlanBucket, string> = {
  now: 'NOW',
  '2027': '2027',
  '2028': '2028',
  '2029': '2029',
  '2030': '2030',
  '2031+': '2031+',
  review: 'REVIEW',
};

export function buildPlanColumns(
  analysis: AnalysisResult,
  plan: Record<string, PlanEntry>,
  buckets: readonly PlanBucket[],
): PlanColumn[] {
  const index = new Map(analysis.findings.map((f) => [f.id, f]));
  const columns: PlanColumn[] = buckets.map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    entries: [],
    overrides: 0,
  }));
  const byBucket = new Map(columns.map((c) => [c.bucket, c]));

  for (const entry of Object.values(plan)) {
    const finding = index.get(entry.findingId);
    if (!finding) continue;
    const bucket = entry.operatorBucket ?? entry.engineBucket;
    const column = byBucket.get(bucket);
    if (!column) continue;
    column.entries.push({ entry, finding });
    if (entry.operatorBucket) column.overrides += 1;
  }

  for (const column of columns) {
    column.entries.sort((a, b) => {
      const delta = (b.finding.urgencyScore ?? -1) - (a.finding.urgencyScore ?? -1);
      return delta !== 0 ? delta : a.finding.id.localeCompare(b.finding.id);
    });
  }
  return columns;
}

export function activeFilterCount(filters: FilterState): number {
  let n = 0;
  if (filters.query.trim()) n += 1;
  n += filters.threatClasses.length;
  n += filters.severities.length;
  n += filters.agilities.length;
  n += filters.confidences.length;
  n += filters.deadlineYears.length;
  n += filters.sourceKinds.length;
  if (filters.onlyHndl) n += 1;
  if (filters.onlyUnknown) n += 1;
  return n;
}
