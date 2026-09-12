import type {
  Coverage,
  CoverageBreakdown,
  CoverageState,
  Finding,
  GapReason,
} from '@/types/domain';

/* ============================================================================
   Coverage.

   The number that matters most in this product is not how many findings are
   critical. It is how much of the inventory could be assessed at all, and why
   the rest could not.

   Nothing here estimates. A finding is assessed, partially assessed, or
   unknown, decided entirely by which inputs were present.
   ========================================================================= */

export function coverageStateOf(finding: Finding): CoverageState {
  if (finding.gaps.some((g) => g.blocking)) return 'unknown';
  if (finding.gaps.length > 0) return 'partial';
  return 'assessed';
}

const GAP_META: Record<GapReason, { label: string; remedy: string }> = {
  'missing-data-lifetime': {
    label: 'Missing data-secrecy lifetime',
    remedy:
      'Supply dataSecrecyLifetimeYears in the context file. This is the input CISA’s automated-discovery strategy names as not collectable by tooling.',
  },
  'missing-migration-effort': {
    label: 'Missing migration effort',
    remedy: 'Supply migrationEffortMonths in the context file, from the owning team’s estimate.',
  },
  'missing-agility': {
    label: 'Missing agility grade',
    remedy:
      'Supply agility in the context file, or record the protocol so it can be inferred.',
  },
  'unrecognized-algorithm': {
    label: 'Unrecognized algorithm',
    remedy:
      'Normalize the algorithm string in the inventory, or record an OID, so the threat class can be resolved.',
  },
  'missing-key-size': {
    label: 'Missing key size',
    remedy: 'Record parameterSetIdentifier or curve on the cryptographic asset.',
  },
  'unsupported-evidence': {
    label: 'Purpose not declared',
    remedy:
      'Record cryptoProperties.primitive or cryptoFunctions so key establishment can be told apart from signing.',
  },
  'embedded-crypto': {
    label: 'Embedded crypto not discoverable',
    remedy:
      'Recorded manually. Automated discovery cannot see inside this component; the entry exists so the gap is counted rather than missed.',
  },
};

export function computeCoverage(findings: Finding[], unparsed: number): Coverage {
  let assessed = 0;
  let partial = 0;
  let unknown = 0;

  const byReason = new Map<GapReason, string[]>();

  for (const finding of findings) {
    const state = coverageStateOf(finding);
    if (state === 'assessed') assessed += 1;
    else if (state === 'partial') partial += 1;
    else unknown += 1;

    for (const gap of finding.gaps) {
      const list = byReason.get(gap.reason) ?? [];
      list.push(finding.id);
      byReason.set(gap.reason, list);
    }
  }

  const total = findings.length;
  const breakdown: CoverageBreakdown[] = [...byReason.entries()]
    .map(([reason, ids]) => ({
      reason,
      label: GAP_META[reason].label,
      remedy: GAP_META[reason].remedy,
      count: ids.length,
      findingIds: ids,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    total,
    assessed,
    partial,
    unknown,
    assessedRatio: total === 0 ? 0 : assessed / total,
    assessableRatio: total === 0 ? 0 : (assessed + partial) / total,
    breakdown,
    unparsed,
  };
}

export const COVERAGE_STATE_LABEL: Record<CoverageState, string> = {
  assessed: 'ASSESSED',
  partial: 'PARTIALLY ASSESSED',
  unknown: 'UNKNOWN',
};

export function gapLabel(reason: GapReason): string {
  return GAP_META[reason].label;
}
