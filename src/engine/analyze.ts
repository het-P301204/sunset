import type {
  AnalysisResult,
  Assumptions,
  CoverageGap,
  DeadlineAnchor,
  EvidenceLink,
  Finding,
  Inventory,
  StageId,
  StageRecord,
} from '@/types/domain';
import { assessAgility, AGILITY_LABEL } from './agility';
import { classify } from './classify';
import { computeCoverage } from './coverage';
import { DEADLINES, governingDeadline } from './deadlines';
import { evaluateMosca, yearFraction } from './mosca';
import { hashString, resolveContext } from './parse';
import { rankFindings } from './rank';
import { score } from './score';

export const ENGINE_VERSION = '0.1.0';

/* ============================================================================
   The pipeline.

       INGEST -> PARSE -> CLASSIFY -> SCORE -> ANCHOR -> TRIAGE

   Deterministic by construction: no clock reads inside the loop, no Math.random,
   no Map iteration order dependence, no floating-point accumulation that
   depends on input order. Running the same inventory with the same assumptions
   twice produces byte-identical output, which is the only way a ranking
   survives being argued about in a review meeting.
   ========================================================================= */

export type StageListener = (stage: StageRecord) => void;

export function analyze(
  inventory: Inventory,
  assumptions: Assumptions,
  onStage?: StageListener,
): AnalysisResult {
  const stages: StageRecord[] = [];
  const clock = makeClock();

  const stage = (id: StageId, label: string, detail: string) => {
    const record: StageRecord = { id, label, detail, durationMs: clock() };
    stages.push(record);
    onStage?.(record);
  };

  stage('ingest', 'Reading inventory', `${formatBytes(inventory.sourceBytes)} · ${inventory.format}`);
  stage(
    'parse',
    'Parsing cryptographic assets',
    `${inventory.assets.length} cryptographic uses, ${inventory.parseWarnings.length} parser notes`,
  );

  const analysisYear = yearFraction(assumptions.analysisDate);
  const findings: Finding[] = [];

  let classified = 0;
  let anchored = 0;

  for (const asset of inventory.assets) {
    const context = resolveContext(asset, inventory.contexts);
    const classification = classify(asset, context);
    if (classification.threatClass !== 'unclassified') classified += 1;

    // The parsers leave `algorithm` empty; normalization belongs to the engine
    // so every format converges on one spelling before anything is compared.
    const resolvedAsset = {
      ...asset,
      algorithm: classification.recognition.canonical,
      keySizeBits: asset.keySizeBits ?? classification.recognition.keySizeBits ?? undefined,
      curve: asset.curve ?? classification.recognition.curve ?? undefined,
    };

    const deadline = governingDeadline(classification.threatClass);
    const anchor: DeadlineAnchor | null =
      deadline && classification.quantumImpact !== 'resistant'
        ? {
            deadline,
            yearsRemaining: round2(yearFraction(deadline.date) - analysisYear),
            rationale: `${deadline.authority} governs ${classification.threatClass.replace('-', ' ')} and is the earliest binding date for this finding.`,
          }
        : null;
    if (anchor) anchored += 1;

    const mosca = evaluateMosca({
      context,
      anchor,
      crqcYear: assumptions.crqcYear,
      analysisYearFraction: analysisYear,
      applicable: classification.quantumImpact === 'broken',
    });

    const agility = assessAgility(resolvedAsset, context);

    const gaps: CoverageGap[] = dedupeGaps([
      ...classification.gaps,
      ...mosca.gaps,
      ...agility.gaps,
    ]);

    const scored = score({
      classification,
      mosca: mosca.result,
      agility: agility.assessment,
      anchor,
      context,
      keySizeBits: resolvedAsset.keySizeBits ?? null,
      minClassicalBits: classification.recognition.profile?.minClassicalBits,
      gaps,
    });

    findings.push({
      id: resolvedAsset.id,
      asset: resolvedAsset,
      context,
      threatClass: classification.threatClass,
      quantumImpact: classification.quantumImpact,
      hndl: classification.hndl,
      anchor,
      mosca: mosca.result,
      agility: agility.assessment,
      severity: scored.severity,
      urgencyScore: scored.urgencyScore,
      verdict: scored.verdict,
      confidence: scored.confidence,
      gaps,
      evidence: buildEvidence(resolvedAsset, context, classification, agility.assessment, assumptions, anchor),
      reasoning: scored.reasoning,
      rank: null,
    });
  }

  stage(
    'classify',
    'Classifying algorithms',
    `${classified} of ${inventory.assets.length} resolved to a threat class`,
  );
  stage(
    'score',
    'Calculating urgency',
    `${findings.filter((f) => f.urgencyScore !== null).length} scored, ${findings.filter((f) => f.urgencyScore === null).length} unassessable`,
  );
  stage('anchor', 'Resolving deadlines', `${anchored} anchored to a published obligation`);

  const ranking = rankFindings(findings);
  const coverage = computeCoverage(findings, countUnparsed(inventory));

  stage('triage', 'Building migration sequence', `${ranking.length} findings ranked`);

  return {
    id: `an-${hashString(`${inventory.id}:${assumptions.crqcYear}:${assumptions.analysisDate}:${findings.length}`)}`,
    inventory,
    assumptions,
    findings,
    ranking,
    coverage,
    deadlines: DEADLINES,
    stages,
    analysedAt: assumptions.analysisDate,
    engineVersion: ENGINE_VERSION,
  };
}

function buildEvidence(
  asset: Finding['asset'],
  context: Finding['context'],
  classification: ReturnType<typeof classify>,
  agility: Finding['agility'],
  assumptions: Assumptions,
  anchor: DeadlineAnchor | null,
): EvidenceLink[] {
  const evidence: EvidenceLink[] = [
    { label: 'Algorithm', value: asset.algorithm, origin: 'engine', mono: true },
    { label: 'As recorded', value: asset.rawAlgorithm, origin: 'inventory', mono: true },
  ];

  if (asset.keySizeBits) {
    evidence.push({
      label: 'Key size',
      value: `${asset.keySizeBits} bits`,
      origin: asset.curve ? 'engine' : 'inventory',
      mono: true,
    });
  }
  if (asset.curve) {
    evidence.push({ label: 'Curve', value: asset.curve, origin: 'inventory', mono: true });
  }
  if (asset.protocol) {
    evidence.push({ label: 'Protocol', value: asset.protocol, origin: 'inventory', mono: true });
  }
  evidence.push({
    label: 'Threat class basis',
    value: classification.basis,
    origin: 'engine',
  });
  evidence.push({
    label: 'Source',
    value: asset.source.locator
      ? `${asset.source.locator}${asset.source.line ? `:${asset.source.line}` : ''}`
      : asset.source.ref,
    origin: 'inventory',
    mono: true,
  });

  evidence.push({
    label: 'Data-secrecy lifetime',
    value:
      context?.dataSecrecyLifetimeYears !== undefined
        ? `${context.dataSecrecyLifetimeYears} years`
        : 'not supplied',
    origin: context?.dataSecrecyLifetimeYears !== undefined ? 'context' : 'engine',
    mono: true,
  });
  evidence.push({
    label: 'Migration effort',
    value:
      context?.migrationEffortMonths !== undefined
        ? `${context.migrationEffortMonths} months`
        : 'not supplied',
    origin: context?.migrationEffortMonths !== undefined ? 'context' : 'engine',
    mono: true,
  });
  evidence.push({
    label: 'Crypto-agility',
    value: `${AGILITY_LABEL[agility.grade]}${agility.basis === 'protocol-inference' ? ' (inferred)' : ''}`,
    origin: agility.basis === 'context' ? 'context' : 'engine',
  });
  if (context?.systemCriticality) {
    evidence.push({
      label: 'System criticality',
      value: context.systemCriticality.toUpperCase(),
      origin: 'context',
    });
  }
  if (context?.owner) {
    evidence.push({ label: 'Owner', value: context.owner, origin: 'context' });
  }
  evidence.push({
    label: 'CRQC horizon',
    value: `${assumptions.crqcYear}`,
    origin: 'assumption',
    mono: true,
  });
  if (anchor) {
    evidence.push({
      label: 'Governing deadline',
      value: `${anchor.deadline.date.slice(0, 10)} · ${anchor.deadline.authority}`,
      origin: 'engine',
      mono: true,
    });
  }
  if (context?.notes) {
    evidence.push({ label: 'Operator note', value: context.notes, origin: 'context' });
  }
  return evidence;
}

/** Two gaps with the same reason and field are one gap. */
function dedupeGaps(gaps: CoverageGap[]): CoverageGap[] {
  const seen = new Set<string>();
  const out: CoverageGap[] = [];
  for (const gap of gaps) {
    const key = `${gap.reason}:${gap.field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(gap);
  }
  return out;
}

function countUnparsed(inventory: Inventory): number {
  return inventory.parseWarnings.filter((w) => w.severity === 'warning').length;
}

/**
 * Elapsed milliseconds between calls. Used only for the pipeline display, and
 * deliberately not part of the analysis id, so timing never makes two
 * otherwise-identical runs look different.
 */
function makeClock(): () => number {
  let last = now();
  return () => {
    const current = now();
    const delta = current - last;
    last = current;
    return Math.round(delta * 100) / 100;
  };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
