import type {
  AssetContext,
  CoverageGap,
  DeadlineAnchor,
  MoscaResult,
  WindowState,
} from '@/types/domain';

/* ============================================================================
   Mosca's inequality.

       T_migrate + T_data_lifetime  >  T_CRQC   =>  already too late

   Two lines of arithmetic. The reason it is not trivial in practice is that
   neither T_migrate nor T_data_lifetime is discoverable by scanning: both are
   operator knowledge. CISA's automated-discovery strategy lists data
   time-to-live among the items that cannot be collected automatically.

   So this function's most important behavior is what it does when an input is
   missing: it returns null for every derived value and a gap naming the exact
   field. It never substitutes an average.
   ========================================================================= */

/** Below this many years of slack the window is real but uncomfortable. */
const TIGHT_SLACK_YEARS = 2;

export interface MoscaInput {
  context: AssetContext | null;
  anchor: DeadlineAnchor | null;
  crqcYear: number;
  analysisYearFraction: number;
  /**
   * True only where a CRQC breaks the primitive. Grover-weakened symmetric and
   * hash primitives are not retroactively exposed by a future machine, so the
   * inequality does not govern them — and asking for a data-secrecy lifetime
   * in order to "assess" an AES-256 key would fill the UNKNOWN column with
   * findings that were never in question.
   */
  applicable: boolean;
}

export interface MoscaOutcome {
  result: MoscaResult;
  gaps: CoverageGap[];
}

export function evaluateMosca({
  context,
  anchor,
  crqcYear,
  analysisYearFraction,
  applicable,
}: MoscaInput): MoscaOutcome {
  const gaps: CoverageGap[] = [];

  const migrationMonths = context?.migrationEffortMonths ?? null;
  const migrationYears = migrationMonths === null ? null : round2(migrationMonths / 12);
  const dataLifetimeYears = context?.dataSecrecyLifetimeYears ?? null;
  const crqcHorizon = round2(crqcYear - analysisYearFraction);

  if (!applicable) {
    return {
      result: {
        applicable: false,
        migrationYears,
        dataLifetimeYears,
        crqcHorizonYears: crqcHorizon,
        crqcYear,
        requiredYears: null,
        slackYears: null,
        satisfied: null,
        deadlineHorizonYears: anchor ? round2(anchor.yearsRemaining) : null,
        deadlineSlackYears: null,
        windowState: 'not-applicable',
      },
      gaps,
    };
  }

  if (migrationYears === null) {
    gaps.push({
      reason: 'missing-migration-effort',
      field: 'migrationEffortMonths',
      detail:
        'No estimated migration effort supplied. Mosca cannot be evaluated and the deadline window cannot be checked.',
      blocking: true,
    });
  }
  if (dataLifetimeYears === null) {
    gaps.push({
      reason: 'missing-data-lifetime',
      field: 'dataSecrecyLifetimeYears',
      detail:
        'No data-secrecy lifetime supplied. This is the input automated discovery cannot collect, and without it exposure cannot be quantified.',
      blocking: true,
    });
  }

  const crqcHorizonYears = crqcHorizon;
  const requiredYears =
    migrationYears !== null && dataLifetimeYears !== null
      ? round2(migrationYears + dataLifetimeYears)
      : null;
  const slackYears = requiredYears === null ? null : round2(crqcHorizonYears - requiredYears);
  const satisfied = slackYears === null ? null : slackYears >= 0;

  const deadlineHorizonYears = anchor ? round2(anchor.yearsRemaining) : null;
  const deadlineSlackYears =
    deadlineHorizonYears !== null && migrationYears !== null
      ? round2(deadlineHorizonYears - migrationYears)
      : null;

  const windowState = resolveWindow(slackYears, deadlineSlackYears);

  return {
    result: {
      applicable: true,
      migrationYears,
      dataLifetimeYears,
      crqcHorizonYears,
      crqcYear,
      requiredYears,
      slackYears,
      satisfied,
      deadlineHorizonYears,
      deadlineSlackYears,
      windowState,
    },
    gaps,
  };
}

/**
 * The window is the worse of the two constraints. A finding can satisfy Mosca
 * and still be unable to reach a regulatory deadline, and vice versa; the
 * operator needs the binding one.
 */
function resolveWindow(
  moscaSlack: number | null,
  deadlineSlack: number | null,
): WindowState {
  const slacks = [moscaSlack, deadlineSlack].filter((s): s is number => s !== null);
  if (slacks.length === 0) return 'unknown';
  const worst = Math.min(...slacks);
  if (worst < 0) return 'insufficient';
  if (worst < TIGHT_SLACK_YEARS) return 'tight';
  return 'sufficient';
}

/** Which constraint is actually binding, for the reasoning chain. */
export function bindingConstraint(m: MoscaResult): 'mosca' | 'deadline' | 'none' {
  if (m.slackYears === null && m.deadlineSlackYears === null) return 'none';
  if (m.slackYears === null) return 'deadline';
  if (m.deadlineSlackYears === null) return 'mosca';
  return m.slackYears <= m.deadlineSlackYears ? 'mosca' : 'deadline';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Fractional year for a date, so horizons are not rounded to whole years. */
export function yearFraction(iso: string): number {
  const d = new Date(iso);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const end = Date.UTC(d.getUTCFullYear() + 1, 0, 1);
  return d.getUTCFullYear() + (d.getTime() - start) / (end - start);
}
