import { describe, expect, it } from 'vitest';
import { analyze } from '@/engine/analyze';
import { simulate, DEFAULT_POLICY } from '@/engine/simulate';
import { buildFixture } from '@/fixtures';
import { buildReport, toCSV, toJSON } from './report';
import type { Assumptions, PlanEntry } from '@/types/domain';

const ASSUMPTIONS: Assumptions = {
  crqcYear: 2032,
  analysisDate: '2026-09-12T00:00:00.000Z',
  riskThreshold: 'low',
  unknownHandling: 'warn',
};

function analysis() {
  return analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
}

describe('export', () => {
  it('carries the analysis id and the assumptions, so a ranking is reproducible', () => {
    const result = analysis();
    const json = JSON.parse(toJSON(result, {}));
    expect(json.sunset.analysisId).toBe(result.id);
    expect(json.sunset.engineVersion).toBe(result.engineVersion);
    expect(json.assumptions.crqcYear).toBe(2032);
    // A ranked list without the CRQC year it was computed against is an
    // opinion, not a result.
    expect(json.sunset.synthetic).toBe(true);
  });

  it('exports the unscored findings too rather than only the ranked ones', () => {
    const result = analysis();
    const json = JSON.parse(toJSON(result, {}));
    expect(json.findings).toHaveLength(result.findings.length);
    const unscored = json.findings.filter((f: { urgencyScore: number | null }) => f.urgencyScore === null);
    expect(unscored.length).toBeGreaterThan(0);
    for (const finding of unscored) expect(finding.gaps.length).toBeGreaterThan(0);
  });

  it('neutralises spreadsheet formula injection from inventory-supplied text', () => {
    const result = analysis();
    // An asset name is attacker-influenced: it comes from a scanner run against
    // someone else's codebase, and it lands in a cell Excel will evaluate.
    const hostile = { ...result.findings[0]! };
    hostile.asset = { ...hostile.asset, name: '=cmd|"/c calc"!A1' };
    const csv = toCSV({ ...result, findings: [hostile] }, {});
    const cell = csv.split('\r\n')[1]!;
    expect(cell).toContain("'=cmd");
    expect(cell.startsWith('=')).toBe(false);
  });

  it('quotes cells containing delimiters and doubles embedded quotes', () => {
    const result = analysis();
    const hostile = { ...result.findings[0]! };
    // Set directly, after parsing: in the product a newline could not reach a
    // cell because sanitize.text strips control characters at the parser
    // boundary. This asserts the second layer, for anything that bypasses it.
    hostile.asset = { ...hostile.asset, name: 'payments, gateway\r\nsecond "row"' };
    const csv = toCSV({ ...result, findings: [hostile] }, {});
    expect(csv).toContain('"payments, gateway\r\nsecond ""row"""');
  });

  it('reports both the engine placement and the operator override', () => {
    const result = analysis();
    const first = result.findings.find((f) => f.rank === 1)!;
    const plan: Record<string, PlanEntry> = {
      [first.id]: {
        findingId: first.id,
        engineBucket: '2028',
        operatorBucket: 'now',
        operatorReason: 'Platform upgrade already scheduled.',
        overriddenAt: '2026-09-12T00:00:00.000Z',
      },
    };
    const model = buildReport(result, plan, null, ['overrides']);
    expect(model.overrides).toHaveLength(1);
    expect(model.overrides[0]!.entry.engineBucket).toBe('2028');
    expect(model.overrides[0]!.entry.operatorBucket).toBe('now');

    const json = JSON.parse(toJSON(result, plan));
    const entry = json.findings.find((f: { id: string }) => f.id === first.id);
    expect(entry.plan.engineBucket).toBe('2028');
    expect(entry.plan.operatorBucket).toBe('now');
  });

  it('only counts a deadline against the instrument that actually governs it', () => {
    const result = analysis();
    const model = buildReport(result, {}, null, ['executive']);
    const total = model.deadlines.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(result.findings.filter((f) => f.anchor).length);
  });

  it('includes the simulation only when that section is selected', () => {
    const result = analysis();
    const sim = simulate(result.findings, DEFAULT_POLICY);
    expect(buildReport(result, {}, sim, ['executive']).simulation).not.toBeNull();
    expect(buildReport(result, {}, null, ['executive']).simulation).toBeNull();
  });
});
