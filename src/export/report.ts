import type {
  AnalysisResult,
  Finding,
  PlanEntry,
  SimulationResult,
} from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';
import { VERDICT_LABEL } from '@/engine/score';
import { BUCKET_LABEL } from '@/state/selectors';
import { rankedFindings, unknownFindings } from '@/state/selectors';

/* ============================================================================
   Export.

   Data transformation, kept away from presentation so the same report model
   feeds the on-screen preview, the printed PDF, the JSON and the CSV. Three
   exports that disagree with each other is how an assessment loses an
   argument.

   Every export carries the analysis id, the engine version, and the operator
   assumptions. A ranked list without the CRQC year it was computed against is
   not reproducible, and a report nobody can reproduce is an opinion.
   ========================================================================= */

/** How an authority is written in prose, as opposed to its enum value. */
export const AUTHORITY_LABEL: Record<string, string> = {
  'EO-14412': 'EO 14412',
  'NIST-IR-8547': 'NIST IR 8547',
  'FIPS-140-3': 'FIPS 140-3',
  ORGANISATION: 'organisational policy',
};

export type ReportSection =
  | 'executive'
  | 'technical'
  | 'roadmap'
  | 'coverage'
  | 'simulation'
  | 'overrides';

export const REPORT_SECTIONS: { id: ReportSection; label: string; summary: string }[] = [
  {
    id: 'executive',
    label: 'Executive summary',
    summary: 'Counts, deadlines, and what the analysis could not assess.',
  },
  {
    id: 'technical',
    label: 'Technical findings',
    summary: 'Every scored finding with its evidence chain inputs.',
  },
  {
    id: 'roadmap',
    label: 'Migration roadmap',
    summary: 'The sequence by start year, engine recommendation and operator placement.',
  },
  {
    id: 'coverage',
    label: 'Coverage statement',
    summary: 'What was assessed, what was not, and the field that blocked each.',
  },
  {
    id: 'simulation',
    label: 'Policy simulation',
    summary: 'What the configured policy would decide. Labelled as a simulation.',
  },
  {
    id: 'overrides',
    label: 'Operator overrides',
    summary: 'Every placement a person changed, with their reason.',
  },
];

export interface ReportModel {
  title: string;
  generatedAt: string;
  analysisId: string;
  engineVersion: string;
  synthetic: boolean;
  inventory: { name: string; format: string; version: string; assets: number };
  assumptions: { crqcYear: number; analysisDate: string };
  counts: Record<string, number>;
  deadlines: { year: number; label: string; authority: string; citation: string; count: number }[];
  top: Finding[];
  unknown: Finding[];
  overrides: { entry: PlanEntry; finding: Finding }[];
  simulation: SimulationResult | null;
  sections: ReportSection[];
}

export function buildReport(
  analysis: AnalysisResult,
  plan: Record<string, PlanEntry>,
  simulation: SimulationResult | null,
  sections: ReportSection[],
): ReportModel {
  const findings = analysis.findings;
  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const deadlines = analysis.deadlines
    .filter((d) => d.effect !== 'milestone')
    .map((deadline) => ({
      year: deadline.year,
      label: deadline.label,
      authority: deadline.authority,
      citation: deadline.citation,
      count: findings.filter((f) => f.anchor?.deadline.id === deadline.id).length,
    }))
    .filter((d) => d.count > 0);

  const index = new Map(findings.map((f) => [f.id, f]));
  const overrides = Object.values(plan)
    .filter((entry) => entry.operatorBucket !== null)
    .map((entry) => ({ entry, finding: index.get(entry.findingId)! }))
    .filter((o) => o.finding);

  return {
    title: 'Cryptographic posture and migration triage',
    generatedAt: new Date().toISOString(),
    analysisId: analysis.id,
    engineVersion: analysis.engineVersion,
    synthetic: analysis.inventory.synthetic,
    inventory: {
      name: analysis.inventory.name,
      format: analysis.inventory.format,
      version: analysis.inventory.version,
      assets: analysis.inventory.assets.length,
    },
    assumptions: {
      crqcYear: analysis.assumptions.crqcYear,
      analysisDate: analysis.analysedAt,
    },
    counts,
    deadlines,
    top: rankedFindings(analysis).slice(0, 25),
    unknown: unknownFindings(analysis),
    overrides,
    simulation,
    sections,
  };
}

/* --- JSON ----------------------------------------------------------------- */

export function toJSON(analysis: AnalysisResult, plan: Record<string, PlanEntry>): string {
  return JSON.stringify(
    {
      sunset: {
        engineVersion: analysis.engineVersion,
        analysisId: analysis.id,
        analysedAt: analysis.analysedAt,
        synthetic: analysis.inventory.synthetic,
      },
      assumptions: analysis.assumptions,
      inventory: {
        name: analysis.inventory.name,
        format: analysis.inventory.format,
        version: analysis.inventory.version,
        producer: analysis.inventory.producer,
        generatedAt: analysis.inventory.generatedAt,
        assets: analysis.inventory.assets.length,
        parseWarnings: analysis.inventory.parseWarnings,
      },
      coverage: analysis.coverage,
      ranking: analysis.ranking,
      findings: analysis.findings.map((finding) => ({
        id: finding.id,
        rank: finding.rank,
        asset: {
          name: finding.asset.name,
          algorithm: finding.asset.algorithm,
          rawAlgorithm: finding.asset.rawAlgorithm,
          protocol: finding.asset.protocol ?? null,
          source: finding.asset.source,
        },
        threatClass: finding.threatClass,
        quantumImpact: finding.quantumImpact,
        hndl: finding.hndl,
        severity: finding.severity,
        urgencyScore: finding.urgencyScore,
        verdict: finding.verdict,
        confidence: finding.confidence,
        deadline: finding.anchor
          ? {
              id: finding.anchor.deadline.id,
              year: finding.anchor.deadline.year,
              authority: finding.anchor.deadline.authority,
              citation: finding.anchor.deadline.citation,
            }
          : null,
        mosca: finding.mosca,
        agility: finding.agility,
        gaps: finding.gaps,
        reasoning: finding.reasoning,
        plan: plan[finding.id]
          ? {
              engineBucket: plan[finding.id]!.engineBucket,
              operatorBucket: plan[finding.id]!.operatorBucket,
              operatorReason: plan[finding.id]!.operatorReason,
              overriddenAt: plan[finding.id]!.overriddenAt,
            }
          : null,
      })),
    },
    null,
    2,
  );
}

/* --- CSV ------------------------------------------------------------------ */

const CSV_COLUMNS = [
  'rank',
  'asset',
  'algorithm',
  'threat_class',
  'quantum_impact',
  'hndl',
  'severity',
  'urgency_score',
  'verdict',
  'confidence',
  'deadline_year',
  'deadline_authority',
  'data_lifetime_years',
  'migration_effort_months',
  'mosca_slack_years',
  'window_state',
  'agility',
  'engine_bucket',
  'operator_bucket',
  'operator_reason',
  'blocking_gaps',
  'source',
] as const;

export function toCSV(analysis: AnalysisResult, plan: Record<string, PlanEntry>): string {
  const rows = [CSV_COLUMNS.join(',')];

  for (const finding of analysis.findings) {
    const entry = plan[finding.id];
    rows.push(
      [
        finding.rank ?? '',
        finding.asset.name,
        finding.asset.algorithm,
        finding.threatClass,
        finding.quantumImpact,
        finding.hndl ? 'yes' : 'no',
        finding.severity,
        finding.urgencyScore ?? '',
        finding.verdict,
        finding.confidence,
        finding.anchor?.deadline.year ?? '',
        finding.anchor?.deadline.authority ?? '',
        finding.mosca.dataLifetimeYears ?? '',
        finding.context?.migrationEffortMonths ?? '',
        finding.mosca.slackYears ?? '',
        finding.mosca.windowState,
        finding.agility.grade,
        entry?.engineBucket ?? '',
        entry?.operatorBucket ?? '',
        entry?.operatorReason ?? '',
        finding.gaps
          .filter((g) => g.blocking)
          .map((g) => g.field)
          .join('; '),
        finding.asset.source.locator ?? finding.asset.source.ref,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  return rows.join('\r\n');
}

/**
 * Quote every cell that needs it, and neutralise the leading characters that
 * make a spreadsheet evaluate a cell as a formula. An inventory is untrusted
 * input; exporting it into Excel is exactly where that stops being theoretical.
 */
function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/* --- download ------------------------------------------------------------- */

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoked on the next tick so the download has taken the handle.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function reportFilename(analysis: AnalysisResult, extension: string): string {
  const date = analysis.analysedAt.slice(0, 10);
  const slug = analysis.inventory.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `sunset-${slug}-${date}.${extension}`;
}

export { AGILITY_LABEL, BUCKET_LABEL, VERDICT_LABEL };
