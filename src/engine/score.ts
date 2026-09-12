import type {
  AgilityAssessment,
  AssetContext,
  Confidence,
  CoverageGap,
  DeadlineAnchor,
  MoscaResult,
  ReasoningStep,
  Severity,
  Verdict,
} from '@/types/domain';
import type { Classification } from './classify';
import { agilityWeight } from './agility';

/* ============================================================================
   Urgency scoring.

   Deterministic and additive so that every point on the score can be shown to
   the operator as a line in the evidence chain. There is no model, no
   weighting matrix nobody can read, and no tuned constant without a stated
   reason. The same inputs give the same number, every run.

   The score is deliberately refused — null, not zero — when a blocking input
   is missing. A zero would sort to the bottom of the queue and read as "safe",
   which is the exact failure mode this product exists to prevent.
   ========================================================================= */

export interface ScoreInput {
  classification: Classification;
  mosca: MoscaResult;
  agility: AgilityAssessment;
  anchor: DeadlineAnchor | null;
  context: AssetContext | null;
  keySizeBits: number | null;
  minClassicalBits: number | undefined;
  gaps: CoverageGap[];
}

export interface ScoreOutput {
  urgencyScore: number | null;
  severity: Severity;
  verdict: Verdict;
  confidence: Confidence;
  reasoning: ReasoningStep[];
}

/*
 * Weights are calibrated so that a fully-aggravated key-establishment finding
 * lands just under the 100 ceiling rather than saturating it. A scale where a
 * quarter of the queue reads "100" has stopped ranking anything.
 *
 * Key establishment outranks signatures at the base because the exposure is
 * retroactive: a recorded handshake is decryptable later, a signature made
 * today is not forgeable later.
 */
const BASE_BY_EXPOSURE: Record<string, number> = {
  'key-establishment:broken': 30,
  'signature:broken': 24,
  'symmetric:weakened': 6,
  'hash:weakened': 5,
};

const W_HNDL = 10;
const W_WINDOW_INSUFFICIENT = 18;
const W_WINDOW_TIGHT = 9;
const W_DEADLINE_MAX = 9;
const W_DEADLINE_PASSED = 12;
const W_EXCESS_MAX = 8;
const W_CLASSICALLY_BROKEN = 12;
const W_KEYSIZE_WEAK = 7;

export function score(input: ScoreInput): ScoreOutput {
  const { classification, mosca, agility, anchor, context, keySizeBits, minClassicalBits, gaps } =
    input;
  const reasoning: ReasoningStep[] = [];
  const blocking = gaps.filter((g) => g.blocking);

  reasoning.push({
    label: 'Threat class',
    value: classification.threatClass.replace('-', ' ').toUpperCase(),
    tone: classification.threatClass === 'unclassified' ? 'unknown' : 'neutral',
  });
  reasoning.push({
    label: 'Quantum impact',
    value: classification.quantumImpact.toUpperCase(),
    tone:
      classification.quantumImpact === 'broken'
        ? 'aggravating'
        : classification.quantumImpact === 'resistant'
          ? 'mitigating'
          : 'unknown',
  });

  if (blocking.length > 0) {
    for (const gap of blocking) {
      reasoning.push({
        label: 'Missing input',
        value: gap.field,
        tone: 'unknown',
      });
    }
    return {
      urgencyScore: null,
      severity: 'unknown',
      verdict: 'insufficient-data',
      confidence: 'none',
      reasoning,
    };
  }

  // --- base exposure -------------------------------------------------------
  const key = `${classification.threatClass}:${classification.quantumImpact}`;
  let total = BASE_BY_EXPOSURE[key] ?? 0;
  reasoning.push({
    label: 'Base exposure',
    value: `${total}`,
    weight: total,
    tone: total > 0 ? 'aggravating' : 'mitigating',
  });

  // --- harvest now, decrypt later -----------------------------------------
  if (classification.hndl) {
    total += W_HNDL;
    reasoning.push({
      label: 'HNDL exposure',
      value: 'Recorded traffic is decryptable retroactively',
      weight: W_HNDL,
      tone: 'aggravating',
    });
  }

  // --- migration window ----------------------------------------------------
  const windowWeight =
    mosca.windowState === 'insufficient'
      ? W_WINDOW_INSUFFICIENT
      : mosca.windowState === 'tight'
        ? W_WINDOW_TIGHT
        : 0;
  if (windowWeight > 0) {
    total += windowWeight;
    reasoning.push({
      label: 'Migration window',
      value: mosca.windowState.toUpperCase(),
      weight: windowWeight,
      tone: 'aggravating',
    });
  } else if (mosca.windowState === 'sufficient') {
    reasoning.push({
      label: 'Migration window',
      value: 'SUFFICIENT',
      weight: 0,
      tone: 'mitigating',
    });
  } else if (mosca.windowState === 'not-applicable') {
    reasoning.push({
      label: 'Mosca inequality',
      value: 'NOT APPLICABLE — a CRQC does not break this primitive',
      weight: 0,
      tone: 'mitigating',
    });
  }

  // --- deadline proximity --------------------------------------------------
  if (anchor) {
    const years = anchor.yearsRemaining;
    const proximity =
      years < 0
        ? W_DEADLINE_PASSED
        : clamp(Math.round((1 - years / 10) * W_DEADLINE_MAX), 0, W_DEADLINE_MAX);
    total += proximity;
    reasoning.push({
      label: 'Deadline proximity',
      value:
        years < 0
          ? `${anchor.deadline.year} deadline has passed`
          : `${years.toFixed(1)} years to ${anchor.deadline.year}`,
      weight: proximity,
      tone: proximity >= W_DEADLINE_MAX - 2 ? 'aggravating' : 'neutral',
    });
  } else {
    reasoning.push({
      label: 'Deadline',
      value: 'No published deadline governs this threat class',
      weight: 0,
      tone: 'mitigating',
    });
  }

  // --- exposure beyond the CRQC horizon ------------------------------------
  if (mosca.applicable && mosca.dataLifetimeYears !== null) {
    const excess = mosca.dataLifetimeYears - mosca.crqcHorizonYears;
    if (excess > 0) {
      const w = clamp(Math.round(excess * 0.8), 0, W_EXCESS_MAX);
      total += w;
      reasoning.push({
        label: 'Secrecy beyond CRQC horizon',
        value: `${excess.toFixed(1)} years of data remain sensitive past ${mosca.crqcYear}`,
        weight: w,
        tone: 'aggravating',
      });
    }
  }

  // --- classical weakness, independent of any quantum consideration --------
  if (classification.recognition.profile?.classicallyBroken) {
    total += W_CLASSICALLY_BROKEN;
    reasoning.push({
      label: 'Classical strength',
      value: 'Already broken classically; a CRQC is not the reason to remove it',
      weight: W_CLASSICALLY_BROKEN,
      tone: 'aggravating',
    });
  } else if (
    minClassicalBits !== undefined &&
    keySizeBits !== null &&
    keySizeBits < minClassicalBits
  ) {
    total += W_KEYSIZE_WEAK;
    reasoning.push({
      label: 'Classical strength',
      value: `${keySizeBits}-bit is below the ${minClassicalBits}-bit floor for this family`,
      weight: W_KEYSIZE_WEAK,
      tone: 'aggravating',
    });
  }

  // --- system criticality --------------------------------------------------
  const crit = context?.systemCriticality;
  const critWeight = crit === 'hva' ? 7 : crit === 'high' ? 4 : crit === 'moderate' ? 2 : 0;
  if (critWeight > 0) {
    total += critWeight;
    reasoning.push({
      label: 'System criticality',
      value: crit === 'hva' ? 'HIGH-VALUE ASSET' : crit!.toUpperCase(),
      weight: critWeight,
      tone: 'aggravating',
    });
  }

  // --- agility multiplier --------------------------------------------------
  const weight = agilityWeight(agility.grade);
  const preAgility = total;
  total = total * weight;
  if (weight !== 1.0) {
    reasoning.push({
      label: 'Crypto-agility',
      value: `${agility.grade.replace('-', ' ').toUpperCase()} (x${weight.toFixed(2)})`,
      weight: Math.round((total - preAgility) * 10) / 10,
      tone: weight > 1 ? 'aggravating' : 'mitigating',
    });
  }

  const urgencyScore = clamp(Math.round(total), 0, 100);
  const severity = severityFor(urgencyScore, classification.quantumImpact);
  const verdict = verdictFor(severity, mosca, classification.quantumImpact, urgencyScore);
  const confidence = confidenceFor(gaps);

  reasoning.push({
    label: 'Urgency score',
    value: `${urgencyScore} / 100`,
    tone: 'neutral',
  });

  return { urgencyScore, severity, verdict, confidence, reasoning };
}

/*
 * Band boundaries are calibrated against what the combination actually means,
 * not against a round number. CRITICAL starts at 70 because that is where a
 * Shor-broken primitive with an insufficient migration window on a high-value
 * system lands; nothing reaches it on deadline proximity alone.
 */
const BAND_CRITICAL = 70;
const BAND_HIGH = 50;
const BAND_MEDIUM = 30;
const BAND_LOW = 12;

function severityFor(scoreValue: number, impact: string): Severity {
  if (impact === 'resistant') return 'safe';
  if (scoreValue >= BAND_CRITICAL) return 'critical';
  if (scoreValue >= BAND_HIGH) return 'high';
  if (scoreValue >= BAND_MEDIUM) return 'medium';
  if (scoreValue >= BAND_LOW) return 'low';
  return 'safe';
}

function verdictFor(
  severity: Severity,
  mosca: MoscaResult,
  impact: string,
  scoreValue: number,
): Verdict {
  if (impact === 'resistant') return 'compliant';
  if (mosca.windowState === 'insufficient') return 'migrate-now';
  if (scoreValue >= BAND_HIGH) return 'migrate-now';
  if (scoreValue >= BAND_MEDIUM) return 'schedule';
  if (severity === 'safe') return 'compliant';
  return 'monitor';
}

function confidenceFor(gaps: CoverageGap[]): Confidence {
  if (gaps.some((g) => g.blocking)) return 'none';
  if (gaps.length >= 2) return 'low';
  if (gaps.length === 1) return 'medium';
  return 'high';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  'migrate-now': 'MIGRATE NOW',
  schedule: 'SCHEDULE',
  monitor: 'MONITOR',
  compliant: 'COMPLIANT',
  'insufficient-data': 'INSUFFICIENT DATA',
};

