import type {
  AgilityGrade,
  AssetContext,
  CryptoAsset,
  Inventory,
  InventoryFormat,
  ParseWarning,
} from '@/types/domain';
import * as s from '../sanitize';
import { hashString, parseCycloneDX } from './cyclonedx';

/* ============================================================================
   Format detection and the two SUNSET-native formats.

   SUNSET reads three things:
     1. a CycloneDX 1.6 CBOM                      -> what crypto exists
     2. a repository crypto-discovery export      -> where it is called from
     3. a SUNSET context file                     -> the facts nobody can scan

   The third exists because the first two cannot carry data-secrecy lifetime or
   migration effort. Keeping it a separate document is the honest arrangement:
   it makes visible that those values are human judgement, supplied by someone
   with a name, rather than measurements.
   ========================================================================= */

export class ParseError extends Error {
  constructor(
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export function detectFormat(doc: unknown): InventoryFormat {
  if (s.text(s.prop(doc, 'bomFormat'), 40) === 'CycloneDX') return 'cyclonedx-cbom';
  const native = s.text(s.prop(doc, 'sunsetFormat'), 40);
  if (native === 'repo-scan') return 'repo-scan';
  if (native === 'context') return 'sunset-context';
  if (Array.isArray(s.prop(doc, 'findings'))) return 'repo-scan';
  if (Array.isArray(s.prop(doc, 'assets')) && !s.prop(doc, 'components')) return 'sunset-context';
  return 'unknown';
}

export interface ParsedDocument {
  format: InventoryFormat;
  inventory?: Inventory;
  contexts?: AssetContext[];
}

export function parseDocument(raw: string, fileName: string): ParsedDocument {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    throw new ParseError(
      'The file is not valid JSON.',
      err instanceof Error ? err.message : 'The parser could not read the document.',
    );
  }
  if (!doc || typeof doc !== 'object') {
    throw new ParseError(
      'The file is not an inventory document.',
      'The top level of the document is not an object.',
    );
  }

  const bytes = new TextEncoder().encode(raw).length;
  const format = detectFormat(doc);

  switch (format) {
    case 'cyclonedx-cbom':
      return { format, inventory: parseCycloneDX(doc, bytes, stripExtension(fileName)) };
    case 'repo-scan':
      return { format, inventory: parseRepoScan(doc, bytes, stripExtension(fileName)) };
    case 'sunset-context':
      return { format, contexts: parseContext(doc) };
    default:
      throw new ParseError(
        'Unsupported inventory format.',
        'SUNSET reads a CycloneDX 1.6 CBOM, a repository crypto-discovery export, or a SUNSET context file. This document matched none of them.',
      );
  }
}

/* --- repository crypto discovery ----------------------------------------- */

export function parseRepoScan(doc: unknown, sourceBytes: number, name: string): Inventory {
  const warnings: ParseWarning[] = [];
  const assets: CryptoAsset[] = [];
  const findings = s.prop(doc, 'findings');
  const repository = s.text(s.prop(doc, 'repository'), 120);

  if (!Array.isArray(findings)) {
    throw new ParseError(
      'The repository scan contains no findings array.',
      'A repo-scan document must carry a top-level "findings" array.',
    );
  }

  findings.slice(0, 20000).forEach((f, i) => {
    const algorithm = s.text(s.prop(f, 'algorithm'), 120);
    if (!algorithm) {
      warnings.push({
        severity: 'warning',
        at: `$.findings[${i}]`,
        message: 'Finding carries no algorithm and was skipped.',
      });
      return;
    }
    const file = s.locator(s.prop(f, 'file'));
    const component = s.text(s.prop(f, 'component'), 120);
    const id = s.text(s.prop(f, 'id'), 120) || `scan-${hashString(`${file}:${algorithm}:${i}`)}`;

    assets.push({
      id,
      name: component || (file ? file.split('/')[0]! : repository || 'repository'),
      algorithm: '',
      rawAlgorithm: algorithm,
      primitive: s.text(s.prop(f, 'primitive'), 40) || undefined,
      keySizeBits: s.boundedNumber(s.prop(f, 'keySizeBits'), 8, 16384),
      curve: s.text(s.prop(f, 'curve'), 40) || undefined,
      protocol: s.text(s.prop(f, 'protocol'), 40) || undefined,
      functions: s.stringArray(s.prop(f, 'functions')),
      source: {
        kind: 'repo-callsite',
        ref: id,
        locator: file || undefined,
        line: s.boundedNumber(s.prop(f, 'line'), 1, 10_000_000),
      },
      attributes: {
        ...(s.text(s.prop(f, 'symbol'), 120) ? { symbol: s.text(s.prop(f, 'symbol'), 120) } : {}),
        ...(s.text(s.prop(f, 'language'), 40)
          ? { language: s.text(s.prop(f, 'language'), 40) }
          : {}),
        ...s.attributes(s.prop(f, 'metadata'), 12),
      },
    });
  });

  return {
    id: `inv-${hashString(`${name}:${sourceBytes}:${assets.length}`)}`,
    name: s.text(name, 120) || repository || 'Repository scan',
    format: 'repo-scan',
    version: s.text(s.prop(doc, 'version'), 40) || 'not declared',
    generatedAt: s.isoDate(s.prop(doc, 'generatedAt')),
    producer: s.text(s.prop(doc, 'producer'), 80) || null,
    assets,
    contexts: [],
    synthetic: false,
    parseWarnings: warnings,
    sourceBytes,
  };
}

/* --- SUNSET context ------------------------------------------------------- */

const AGILITY_VALUES = new Set<AgilityGrade>([
  'negotiated',
  'configuration',
  'hardcoded',
  'vendor-controlled',
  'unknown',
]);

const CRITICALITY_VALUES = new Set(['hva', 'high', 'moderate', 'low']);

export function parseContext(doc: unknown): AssetContext[] {
  const list = s.prop(doc, 'assets');
  if (!Array.isArray(list)) {
    throw new ParseError(
      'The context file contains no assets array.',
      'A context document must carry a top-level "assets" array, each entry keyed by a selector.',
    );
  }

  const out: AssetContext[] = [];
  for (const entry of list.slice(0, 20000)) {
    const selector = s.text(s.prop(entry, 'selector'), 200);
    if (!selector) continue;

    const agilityRaw = s.text(s.prop(entry, 'agility'), 40) as AgilityGrade;
    const criticalityRaw = s.text(s.prop(entry, 'systemCriticality'), 20);

    out.push({
      selector,
      // Bounded: a 500-year secrecy lifetime is a typo, not a requirement, and
      // an unbounded value would silently dominate every score in the queue.
      dataSecrecyLifetimeYears: s.boundedNumber(
        s.prop(entry, 'dataSecrecyLifetimeYears'),
        0,
        100,
      ),
      migrationEffortMonths: s.boundedNumber(s.prop(entry, 'migrationEffortMonths'), 0, 600),
      agility: AGILITY_VALUES.has(agilityRaw) ? agilityRaw : undefined,
      systemCriticality: CRITICALITY_VALUES.has(criticalityRaw)
        ? (criticalityRaw as AssetContext['systemCriticality'])
        : undefined,
      hndlExposed: s.boolean(s.prop(entry, 'hndlExposed')),
      owner: s.text(s.prop(entry, 'owner'), 80) || undefined,
      notes: s.text(s.prop(entry, 'notes'), 400) || undefined,
    });
  }
  return out;
}

/**
 * Match a context entry to an asset. Selectors match an asset id, its bom-ref,
 * its exact name, or a `prefix*` glob. Exact matches win over globs so a
 * specific override is never shadowed by a broad one.
 */
export function resolveContext(
  asset: CryptoAsset,
  contexts: AssetContext[],
): AssetContext | null {
  let glob: AssetContext | null = null;
  let globLength = -1;

  for (const ctx of contexts) {
    const sel = ctx.selector;
    if (sel === asset.id || sel === asset.source.ref || sel === asset.name) return ctx;
    if (sel.endsWith('*')) {
      const prefix = sel.slice(0, -1);
      const target = [asset.id, asset.source.ref, asset.name, asset.rawAlgorithm];
      if (target.some((t) => t.startsWith(prefix)) && prefix.length > globLength) {
        glob = ctx;
        globLength = prefix.length;
      }
    }
  }
  return glob;
}

function stripExtension(fileName: string): string {
  return s.text(fileName, 120).replace(/\.(json|cdx|cbom)$/i, '');
}

export { parseCycloneDX, hashString };
