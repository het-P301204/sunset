/* ============================================================================
   SUNSET domain model
   ---------------------------------------------------------------------------
   This file is the contract between the analysis engine and the interface.
   Presentation code imports these types and nothing from src/engine/** except
   through src/adapters/engine.ts. Swapping the in-browser engine for a service
   should require no change here and no change to any component.

   Design rule that runs through the whole model: every value the engine could
   not determine is `null` with a recorded reason, never a default. There is no
   "assume 10 years" anywhere. See CoverageGap.
   ========================================================================= */

/* --- 1. classification ---------------------------------------------------- */

/**
 * How the cryptographic use is attacked, which decides both the governing
 * deadline and the exposure profile. Key establishment is separated from
 * signatures because harvested key-establishment traffic is decryptable
 * retroactively and a signature is not.
 */
export type ThreatClass =
  | 'key-establishment'
  | 'signature'
  | 'symmetric'
  | 'hash'
  | 'unclassified';

/** What a cryptographically relevant quantum computer does to this primitive. */
export type QuantumImpact =
  | 'broken' // Shor: asymmetric key establishment and signatures
  | 'weakened' // Grover: effective symmetric/hash strength halved
  | 'resistant' // FIPS 203/204/205 or adequate classical margin
  | 'unknown';

/**
 * How hard the algorithm is to replace. Ordered from easiest to hardest; the
 * interface renders this as a spectrum rather than a badge because the
 * position between the ends is the useful information.
 */
export type AgilityGrade =
  | 'negotiated' // swapped by protocol negotiation, no code change
  | 'configuration' // swapped by configuration or policy change
  | 'hardcoded' // swapped only by changing and shipping code
  | 'vendor-controlled' // not swappable by this organisation at all
  | 'unknown';

export const AGILITY_ORDER: readonly AgilityGrade[] = [
  'negotiated',
  'configuration',
  'hardcoded',
  'vendor-controlled',
] as const;

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'safe' | 'unknown';

export const SEVERITY_ORDER: readonly Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'safe',
  'unknown',
] as const;

/** The engine's recommendation for a finding. */
export type Verdict =
  | 'migrate-now'
  | 'schedule'
  | 'monitor'
  | 'compliant'
  | 'insufficient-data';

/**
 * How much of the scoring input was actually present. This is not a
 * probability; it is a count of how many required inputs were supplied.
 */
export type Confidence = 'high' | 'medium' | 'low' | 'none';

/** Why an asset could not be fully assessed. Always names a specific field. */
export type GapReason =
  | 'missing-data-lifetime'
  | 'missing-migration-effort'
  | 'missing-agility'
  | 'unrecognized-algorithm'
  | 'missing-key-size'
  | 'unsupported-evidence'
  | 'embedded-crypto';

export interface CoverageGap {
  reason: GapReason;
  /** The exact field or evidence that was absent, in the inventory's own terms. */
  field: string;
  /** One sentence a security engineer would accept, written by the engine. */
  detail: string;
  /** Whether supplying this single field would move the finding out of UNKNOWN. */
  blocking: boolean;
}

/* --- 2. inventory input --------------------------------------------------- */

export type InventoryFormat =
  | 'cyclonedx-cbom'
  | 'repo-scan'
  | 'sunset-context'
  | 'unknown';

export interface InventorySource {
  /** Where this asset came from, for evidence display. Never a local path. */
  kind: 'cbom-component' | 'repo-callsite' | 'tls-config' | 'certificate' | 'manual';
  /** A stable reference inside the source document (bom-ref, rule id, etc). */
  ref: string;
  /** File or location as reported by the inventory, already sanitized. */
  locator?: string;
  line?: number;
}

export interface CertificateRef {
  subject?: string;
  issuer?: string;
  signatureAlgorithm?: string;
  notAfter?: string;
  serialNumber?: string;
}

/** A single cryptographic use, as it exists in the inventory before analysis. */
export interface CryptoAsset {
  id: string;
  /** The system, service or component the crypto belongs to. */
  name: string;
  /** Normalized algorithm identifier, e.g. "RSA-2048", "ECDSA-P256", "ML-KEM-768". */
  algorithm: string;
  /** Exactly as the inventory spelled it, preserved for evidence. */
  rawAlgorithm: string;
  /** CycloneDX primitive where given: pke, signature, kem, hash, block-cipher... */
  primitive?: string;
  keySizeBits?: number;
  curve?: string;
  /** Protocol the use sits inside, e.g. "TLSv1.3", "SSH", "JWT". */
  protocol?: string;
  /** The cryptographic function the use performs, e.g. "keygen", "sign", "encrypt". */
  functions?: string[];
  certificate?: CertificateRef;
  source: InventorySource;
  /** Raw key/value pairs carried through from the inventory for the evidence panel. */
  attributes: Record<string, string>;
}

/**
 * The per-asset facts that automated discovery cannot collect and a human must
 * supply. CISA's own automated-discovery strategy names data time-to-live as
 * one of these. Every field is optional on purpose: absence is a finding.
 */
export interface AssetContext {
  /** Matches an asset by id, bom-ref, or exact name. */
  selector: string;
  dataSecrecyLifetimeYears?: number;
  migrationEffortMonths?: number;
  agility?: AgilityGrade;
  /** Drives which EO 14412 obligation applies. */
  systemCriticality?: 'hva' | 'high' | 'moderate' | 'low';
  /** Whether traffic is exposed to capture for later decryption. */
  hndlExposed?: boolean;
  owner?: string;
  notes?: string;
}

export interface Inventory {
  id: string;
  name: string;
  format: InventoryFormat;
  /** Version string as declared by the inventory document, not invented. */
  version: string;
  /** ISO-8601. The inventory's own timestamp where it has one. */
  generatedAt: string | null;
  /** The tool that produced it, as declared. */
  producer: string | null;
  assets: CryptoAsset[];
  contexts: AssetContext[];
  /** True when the inventory shipped with SUNSET rather than being imported. */
  synthetic: boolean;
  /** Parser notes the interface must surface rather than swallow. */
  parseWarnings: ParseWarning[];
  /** Byte length of the source document, for the evidence panel. */
  sourceBytes: number;
}

export interface ParseWarning {
  severity: 'warning' | 'error';
  /** JSON pointer or component ref where the problem is. */
  at: string;
  message: string;
}

/* --- 3. deadlines --------------------------------------------------------- */

export type DeadlineAuthority = 'EO-14412' | 'NIST-IR-8547' | 'FIPS-140-3' | 'ORGANISATION';

export interface Deadline {
  id: string;
  /** Calendar year the obligation bites. */
  year: number;
  /** ISO date of the obligation itself where the source gives one. */
  date: string;
  label: string;
  authority: DeadlineAuthority;
  /** The clause, in the source's own words, short enough to render inline. */
  clause: string;
  /** Public citation. Never invented. */
  citation: string;
  /** Empty for a milestone: it is timeline context, not an obligation on an asset. */
  appliesTo: ThreatClass[];
  /**
   * 'deprecated' obligations still permit use; 'disallowed' ones do not;
   * 'mandated' sets a hard date. 'milestone' binds a publisher, not an asset
   * owner, and never governs a finding.
   */
  effect: 'deprecated' | 'disallowed' | 'mandated' | 'milestone';
}

export interface DeadlineAnchor {
  deadline: Deadline;
  /** Years from the analysis date to the deadline. Can be negative. */
  yearsRemaining: number;
  /** Why this deadline governs this finding rather than another. */
  rationale: string;
}

/* --- 4. Mosca ------------------------------------------------------------- */

export type WindowState =
  | 'sufficient'
  | 'tight'
  | 'insufficient'
  | 'unknown'
  | 'not-applicable';

/**
 * Mosca's inequality: if migration time + data secrecy lifetime exceeds the
 * time until a CRQC exists, the data is already exposed and migration is late.
 * Every field is null when its input was absent; nothing is defaulted.
 */
export interface MoscaResult {
  /**
   * Whether the inequality is the right instrument for this finding at all.
   * False for primitives a CRQC does not break: recorded AES-256 traffic is
   * not retroactively readable, so data-secrecy lifetime does not decide its
   * migration date and demanding that input would manufacture a false UNKNOWN.
   */
  applicable: boolean;
  /** T_migrate, in years. Derived from migrationEffortMonths. */
  migrationYears: number | null;
  /** T_data, in years. */
  dataLifetimeYears: number | null;
  /** T_CRQC, in years from the analysis date. An operator assumption. */
  crqcHorizonYears: number;
  /** The operator's assumed CRQC year, echoed for display. */
  crqcYear: number;
  /** migrationYears + dataLifetimeYears. */
  requiredYears: number | null;
  /** crqcHorizonYears - requiredYears. Negative means the inequality is violated. */
  slackYears: number | null;
  /** false = inequality violated = migrate now. null = cannot evaluate. */
  satisfied: boolean | null;
  /** Years between now and the governing regulatory deadline. */
  deadlineHorizonYears: number | null;
  /** deadlineHorizonYears - migrationYears. Negative means the deadline is unreachable. */
  deadlineSlackYears: number | null;
  windowState: WindowState;
}

/* --- 5. findings ---------------------------------------------------------- */

export interface EvidenceLink {
  label: string;
  value: string;
  /** Where the value came from: the inventory, the context file, or an assumption. */
  origin: 'inventory' | 'context' | 'assumption' | 'engine';
  mono?: boolean;
}

export interface ReasoningStep {
  label: string;
  value: string;
  /** Contribution to the urgency score, where the step is a scoring input. */
  weight?: number;
  tone?: 'neutral' | 'aggravating' | 'mitigating' | 'unknown';
}

export interface AgilityAssessment {
  grade: AgilityGrade;
  /** 0..3 position on the spectrum, or null when unknown. */
  position: number | null;
  /** How the grade was arrived at. */
  basis: 'context' | 'protocol-inference' | 'unknown';
  note: string;
}

export interface Finding {
  id: string;
  asset: CryptoAsset;
  context: AssetContext | null;
  threatClass: ThreatClass;
  quantumImpact: QuantumImpact;
  /** True when captured traffic is decryptable once a CRQC exists. */
  hndl: boolean;
  anchor: DeadlineAnchor | null;
  mosca: MoscaResult;
  agility: AgilityAssessment;
  severity: Severity;
  /** 0..100, deterministic. Null when the finding could not be scored at all. */
  urgencyScore: number | null;
  verdict: Verdict;
  confidence: Confidence;
  /** Empty means fully assessed. Non-empty is the whole reason UNKNOWN exists. */
  gaps: CoverageGap[];
  evidence: EvidenceLink[];
  reasoning: ReasoningStep[];
  /** Rank in the migration queue. Unscored findings are not ranked. */
  rank: number | null;
}

/* --- 6. coverage ---------------------------------------------------------- */

export type CoverageState = 'assessed' | 'partial' | 'unknown';

export interface CoverageBreakdown {
  reason: GapReason;
  label: string;
  /** What supplying this field would unlock, in the product's own language. */
  remedy: string;
  count: number;
  findingIds: string[];
}

export interface Coverage {
  total: number;
  assessed: number;
  partial: number;
  unknown: number;
  /** 0..1. assessed / total. */
  assessedRatio: number;
  /** 0..1. (assessed + partial) / total. The honest "assessable" figure. */
  assessableRatio: number;
  breakdown: CoverageBreakdown[];
  /** Assets the parser saw but could not turn into findings at all. */
  unparsed: number;
}

/* --- 7. simulation -------------------------------------------------------- */

export type UnknownHandling = 'block' | 'warn' | 'allow';

export interface PolicySpec {
  id: string;
  name: string;
  /** Empty array means "every threat class". */
  threatClasses: ThreatClass[];
  /** Algorithm family prefixes, e.g. ["RSA", "ECDSA"]. Empty means all. */
  algorithmFamilies: string[];
  /** Findings at or above this severity are in scope. */
  severityThreshold: Severity;
  /** Only findings governed by a deadline at or before this year. Null = any. */
  deadlineOnOrBefore: number | null;
  /** Minimum agility required to pass. Null = agility is not checked. */
  requireAgilityAtLeast: AgilityGrade | null;
  unknownHandling: UnknownHandling;
}

export type EnforcementOutcome = 'blocked' | 'warned' | 'allowed' | 'unevaluable';

export interface EnforcementDecision {
  findingId: string;
  outcome: EnforcementOutcome;
  /** The specific clause of the policy that produced the outcome. */
  reason: string;
}

export interface SimulationResult {
  policy: PolicySpec;
  decisions: EnforcementDecision[];
  blocked: number;
  warned: number;
  allowed: number;
  unevaluable: number;
}

/* --- 8. migration plan ---------------------------------------------------- */

export type PlanBucket = 'now' | '2027' | '2028' | '2029' | '2030' | '2031+' | 'review';

export const PLAN_BUCKETS: readonly PlanBucket[] = [
  'now',
  '2027',
  '2028',
  '2029',
  '2030',
  '2031+',
  'review',
] as const;

export interface PlanEntry {
  findingId: string;
  /** Where the engine put it. Never mutated by an override. */
  engineBucket: PlanBucket;
  /** Where the operator moved it, if anywhere. */
  operatorBucket: PlanBucket | null;
  /** Required when operatorBucket is set. */
  operatorReason: string | null;
  /** ISO timestamp of the override. */
  overriddenAt: string | null;
}

export interface MigrationPlan {
  entries: PlanEntry[];
}

/* --- 9. analysis ---------------------------------------------------------- */

/** Operator assumptions. Every one of these is an input, not a constant. */
export interface Assumptions {
  /** The year the operator assumes a CRQC exists. Visible in the UI at all times. */
  crqcYear: number;
  /** The date the analysis is anchored to. Defaults to today, overridable. */
  analysisDate: string;
  /** Findings at or below this severity are hidden from the default queue. */
  riskThreshold: Severity;
  /** How UNKNOWN findings are treated in the default queue ordering. */
  unknownHandling: UnknownHandling;
}

export type StageId =
  | 'ingest'
  | 'parse'
  | 'classify'
  | 'score'
  | 'anchor'
  | 'triage';

export interface StageRecord {
  id: StageId;
  label: string;
  /** Deterministic count the stage produced, for the pipeline display. */
  detail: string;
  durationMs: number;
}

export interface AnalysisResult {
  /** Stable hash of inventory + assumptions. Identical inputs give an identical id. */
  id: string;
  inventory: Inventory;
  assumptions: Assumptions;
  findings: Finding[];
  /** Finding ids in engine rank order. */
  ranking: string[];
  coverage: Coverage;
  deadlines: Deadline[];
  stages: StageRecord[];
  analysedAt: string;
  engineVersion: string;
}

/* --- 10. UI-facing helpers ------------------------------------------------ */

export interface FilterState {
  query: string;
  threatClasses: ThreatClass[];
  severities: Severity[];
  agilities: AgilityGrade[];
  confidences: Confidence[];
  deadlineYears: number[];
  sourceKinds: InventorySource['kind'][];
  onlyHndl: boolean;
  onlyUnknown: boolean;
}

export type SortKey =
  | 'urgency'
  | 'deadline'
  | 'effort'
  | 'lifetime'
  | 'confidence'
  | 'algorithm'
  | 'name';

export interface SortState {
  key: SortKey;
  direction: 'asc' | 'desc';
}
