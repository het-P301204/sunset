import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import { recognize } from './algorithms';
import { decomposeSuite } from './parse/cyclonedx';
import { simulate, DEFAULT_POLICY } from './simulate';
import { buildFixture } from '@/fixtures';
import { groupByDeadline } from '@/state/selectors';
import type { Assumptions } from '@/types/domain';

const ASSUMPTIONS: Assumptions = {
  crqcYear: 2032,
  analysisDate: '2026-09-12T00:00:00.000Z',
  riskThreshold: 'low',
  unknownHandling: 'warn',
};

describe('algorithm recognition', () => {
  it('normalizes the spellings a CBOM actually contains', () => {
    expect(recognize('rsaEncryption', { keySizeBits: 2048 }).canonical).toBe('RSA-2048');
    expect(recognize('ecdsa-with-SHA384', { curve: 'secp384r1' }).canonical).toBe('ECDSA-P384');
    expect(recognize('curve25519-sha256').canonical).toBe('X25519');
    expect(recognize('ML-KEM-768').canonical).toBe('ML-KEM-768');
    expect(recognize('SHA-256').canonical).toBe('SHA-256');
  });

  it('refuses to guess at an algorithm it does not know', () => {
    const r = recognize('acme_seal_v3');
    expect(r.profile).toBeNull();
    expect(r.canonical).toBe('acme_seal_v3');
  });

  it('marks the FIPS 203/204/205 families resistant and the classical ones broken', () => {
    expect(recognize('ML-KEM-768').profile?.quantumImpact).toBe('resistant');
    expect(recognize('RSA-2048').profile?.quantumImpact).toBe('broken');
    expect(recognize('AES-256').profile?.quantumImpact).toBe('weakened');
  });
});

describe('cipher suite decomposition', () => {
  it('splits a TLS 1.2 suite into its separate migration decisions', () => {
    const roles = decomposeSuite('TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256');
    expect(roles.map((r) => r.role)).toEqual(['kx', 'auth', 'cipher']);
    expect(roles[0]!.algorithm).toBe('ECDHE');
    expect(roles[1]!.algorithm).toBe('RSA');
  });

  it('does not invent a key exchange for a TLS 1.3 suite that names none', () => {
    const roles = decomposeSuite('TLS_AES_256_GCM_SHA384');
    expect(roles.map((r) => r.role)).toEqual(['cipher']);
  });
});

describe('analysis over the synthetic reference estate', () => {
  const inventory = buildFixture('reference-estate')!;
  const result = analyze(inventory, ASSUMPTIONS);

  it('produces findings', () => {
    expect(result.findings.length).toBeGreaterThan(100);
  });

  it('is deterministic: the same inputs give the same ranking and the same id', () => {
    const again = analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
    expect(again.id).toBe(result.id);
    expect(again.ranking).toEqual(result.ranking);
    expect(again.findings.map((f) => f.urgencyScore)).toEqual(
      result.findings.map((f) => f.urgencyScore),
    );
  });

  it('refuses a score rather than defaulting one when an input is missing', () => {
    const unknowns = result.findings.filter((f) => f.urgencyScore === null);
    expect(unknowns.length).toBeGreaterThan(0);
    for (const finding of unknowns) {
      expect(finding.severity).toBe('unknown');
      expect(finding.verdict).toBe('insufficient-data');
      expect(finding.gaps.some((g) => g.blocking)).toBe(true);
      expect(finding.rank).toBeNull();
    }
  });

  it('never ranks an unassessable finding', () => {
    const ranked = new Set(result.ranking);
    for (const finding of result.findings) {
      if (finding.urgencyScore === null) expect(ranked.has(finding.id)).toBe(false);
    }
  });

  it('names a specific missing field on every gap', () => {
    for (const finding of result.findings) {
      for (const gap of finding.gaps) {
        expect(gap.field.length).toBeGreaterThan(0);
        expect(gap.detail.length).toBeGreaterThan(20);
      }
    }
  });

  it('anchors key establishment to 2030 and signatures to 2031', () => {
    const ke = result.findings.find(
      (f) => f.threatClass === 'key-establishment' && f.quantumImpact === 'broken' && f.anchor,
    );
    const sig = result.findings.find(
      (f) => f.threatClass === 'signature' && f.quantumImpact === 'broken' && f.anchor,
    );
    expect(ke?.anchor?.deadline.year).toBe(2030);
    expect(sig?.anchor?.deadline.year).toBe(2031);
  });

  it('does not anchor a quantum-resistant algorithm to a migration deadline', () => {
    const pq = result.findings.filter((f) => f.quantumImpact === 'resistant');
    expect(pq.length).toBeGreaterThan(0);
    for (const finding of pq) {
      expect(finding.anchor).toBeNull();
      expect(finding.verdict).toBe('compliant');
    }
  });

  it('coverage accounts for every finding exactly once', () => {
    const { assessed, partial, unknown, total } = result.coverage;
    expect(assessed + partial + unknown).toBe(total);
    expect(total).toBe(result.findings.length);
  });

  it('sorts the queue by score with a stable tiebreak', () => {
    const scores = result.ranking.map(
      (id) => result.findings.find((f) => f.id === id)!.urgencyScore!,
    );
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
    }
  });

  it('changes the answer when the CRQC assumption changes', () => {
    const earlier = analyze(buildFixture('reference-estate')!, {
      ...ASSUMPTIONS,
      crqcYear: 2029,
    });
    expect(earlier.id).not.toBe(result.id);
    const insufficientNow = earlier.findings.filter(
      (f) => f.mosca.windowState === 'insufficient',
    ).length;
    const insufficientLater = result.findings.filter(
      (f) => f.mosca.windowState === 'insufficient',
    ).length;
    expect(insufficientNow).toBeGreaterThanOrEqual(insufficientLater);
  });
});

describe('discovery without context', () => {
  it('collapses to almost entirely UNKNOWN, which is the point of the fixture', () => {
    const bare = analyze(buildFixture('reference-estate-bare')!, ASSUMPTIONS);
    expect(bare.coverage.unknown).toBeGreaterThan(bare.coverage.assessed);
  });
});

describe('enforcement simulation', () => {
  it('counts every finding exactly once', () => {
    const result = analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
    const sim = simulate(result.findings, DEFAULT_POLICY);
    expect(sim.blocked + sim.warned + sim.allowed + sim.unevaluable).toBe(
      result.findings.length,
    );
  });

  it('gives every decision a reason', () => {
    const result = analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
    const sim = simulate(result.findings, DEFAULT_POLICY);
    for (const decision of sim.decisions) expect(decision.reason.length).toBeGreaterThan(10);
  });

  it('never blocks or warns on a finding it could not score', () => {
    const result = analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
    const unscored = new Set(
      result.findings.filter((f) => f.urgencyScore === null).map((f) => f.id),
    );
    expect(unscored.size).toBeGreaterThan(0);

    for (const handling of ['block', 'warn', 'allow'] as const) {
      const sim = simulate(result.findings, { ...DEFAULT_POLICY, unknownHandling: handling });
      for (const decision of sim.decisions) {
        if (!unscored.has(decision.findingId)) continue;
        // Folding these into blocked/warned would make the UNKNOWN counter read
        // zero under the two common handlings, which is the exact thing this
        // product exists not to do. The only other permitted outcome is
        // ALLOWED, and only when the finding's class puts it outside the
        // policy's scope entirely.
        expect(['unevaluable', 'allowed']).toContain(decision.outcome);
      }
      expect(sim.unevaluable).toBeGreaterThanOrEqual(1);
    }
  });

  it('will not call an unclassified finding out of scope', () => {
    const result = analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
    const unclassified = result.findings.filter((f) => f.threatClass === 'unclassified');
    expect(unclassified.length).toBeGreaterThan(0);

    const sim = simulate(result.findings, DEFAULT_POLICY);
    const byId = new Map(sim.decisions.map((d) => [d.findingId, d]));
    for (const finding of unclassified) {
      expect(byId.get(finding.id)!.outcome).toBe('unevaluable');
    }
  });
});

describe('deadline anchoring', () => {
  it('anchors to the mandate rather than the deprecation that shares its year', () => {
    const result = analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
    const signatures = result.findings.filter(
      (f) => f.threatClass === 'signature' && f.anchor,
    );
    expect(signatures.length).toBeGreaterThan(0);
    for (const finding of signatures) {
      expect(finding.anchor!.deadline.id).toBe('eo-14412-signatures');
      expect(finding.anchor!.deadline.effect).toBe('mandated');
    }
  });

  it('does not double-count a year that carries two instruments', () => {
    const result = analyze(buildFixture('reference-estate')!, ASSUMPTIONS);
    const groups = groupByDeadline(result.findings);
    const ids = groups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    const totalGrouped = groups.reduce((sum, g) => sum + g.findings.length, 0);
    expect(totalGrouped).toBe(result.findings.filter((f) => f.anchor).length);
  });
});
