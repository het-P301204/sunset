import { describe, expect, it } from 'vitest';
import { ParseError, detectFormat, parseDocument, resolveContext } from './index';
import * as s from '../sanitize';
import cbomDoc from '@/fixtures/reference-estate.cbom.json';
import contextDoc from '@/fixtures/reference-estate.context.json';
import scanDoc from '@/fixtures/payments-gateway.scan.json';
import type { CryptoAsset } from '@/types/domain';

/* ============================================================================
   The parser is the untrusted-input boundary, so most of what is worth testing
   here is what it refuses rather than what it accepts.
   ========================================================================= */

describe('format detection', () => {
  it('recognizes each supported document', () => {
    expect(detectFormat(cbomDoc)).toBe('cyclonedx-cbom');
    expect(detectFormat(contextDoc)).toBe('sunset-context');
    expect(detectFormat(scanDoc)).toBe('repo-scan');
  });

  it('does not guess at a document it does not recognize', () => {
    expect(detectFormat({ hello: 'world' })).toBe('unknown');
    expect(detectFormat(null)).toBe('unknown');
  });
});

describe('parseDocument', () => {
  it('reads each fixture through the same path an imported file takes', () => {
    const cbom = parseDocument(JSON.stringify(cbomDoc), 'estate.cbom.json');
    expect(cbom.inventory!.assets.length).toBeGreaterThan(150);
    expect(cbom.inventory!.version).toBe('CycloneDX 1.6');

    const scan = parseDocument(JSON.stringify(scanDoc), 'scan.json');
    expect(scan.inventory!.format).toBe('repo-scan');

    const context = parseDocument(JSON.stringify(contextDoc), 'context.json');
    expect(context.contexts!.length).toBeGreaterThan(10);
  });

  it('reports malformed JSON as a parse error with a usable detail', () => {
    expect(() => parseDocument('{ not json', 'broken.json')).toThrow(ParseError);
    try {
      parseDocument('{ not json', 'broken.json');
    } catch (err) {
      expect((err as ParseError).message).toBe('The file is not valid JSON.');
      expect((err as ParseError).detail.length).toBeGreaterThan(0);
    }
  });

  it('refuses a document that is not an inventory rather than producing an empty one', () => {
    expect(() => parseDocument('{"hello":"world"}', 'x.json')).toThrow(/Unsupported/);
    expect(() => parseDocument('[]', 'x.json')).toThrow(/not an inventory/);
  });

  it('records an error rather than throwing when a CBOM carries no crypto assets', () => {
    const empty = parseDocument(
      JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', components: [] }),
      'empty.json',
    );
    expect(empty.inventory!.assets).toHaveLength(0);
    expect(empty.inventory!.parseWarnings.some((w) => w.severity === 'error')).toBe(true);
  });

  it('warns rather than silently misreading an older spec version', () => {
    const old = parseDocument(
      JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.4', components: [] }),
      'old.json',
    );
    expect(old.inventory!.parseWarnings.some((w) => w.at === '$.specVersion')).toBe(true);
  });
});

describe('sanitization', () => {
  it('strips control characters and bidi overrides', () => {
    // A right-to-left override inside a name can make a rendered path read as
    // something it is not.
    const hostile = `pay\u202Egnp.exe\u202C\u0000ments`;
    const cleaned = s.text(hostile);
    expect(cleaned).not.toContain('\u202E');
    expect(cleaned).not.toContain('\u0000');
  });

  it('caps runaway strings', () => {
    expect(s.text('a'.repeat(5000)).length).toBeLessThanOrEqual(400);
  });

  it('reduces an absolute path to its repository-relative tail', () => {
    expect(s.locator('C:\\Users\\someone\\code\\app\\src\\tls\\handshake.go')).toBe(
      'app/src/tls/handshake.go',
    );
    expect(s.locator('/home/someone/repo/pkg/crypto/x.go')).toBe('repo/pkg/crypto/x.go');
  });

  it('refuses prototype keys', () => {
    const attrs = s.attributes({ __proto__: 'polluted', ok: 'value' });
    expect(attrs.ok).toBe('value');
    expect(Object.prototype.hasOwnProperty.call(attrs, '__proto__')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects an out-of-range operator estimate instead of accepting it', () => {
    expect(s.boundedNumber(500, 0, 100)).toBeUndefined();
    expect(s.boundedNumber(-1, 0, 100)).toBeUndefined();
    expect(s.boundedNumber(20, 0, 100)).toBe(20);
  });
});

describe('context selectors', () => {
  const asset = (over: Partial<CryptoAsset> = {}): CryptoAsset => ({
    id: 'crypto/algorithm/001',
    name: 'payments-gateway',
    algorithm: 'RSA-2048',
    rawAlgorithm: 'RSA',
    source: { kind: 'cbom-component', ref: 'crypto/algorithm/001' },
    attributes: {},
    ...over,
  });

  it('prefers an exact match over a glob', () => {
    const contexts = [
      { selector: 'payments*', dataSecrecyLifetimeYears: 1 },
      { selector: 'payments-gateway', dataSecrecyLifetimeYears: 10 },
    ];
    expect(resolveContext(asset(), contexts)!.dataSecrecyLifetimeYears).toBe(10);
  });

  it('prefers the longest glob when several match', () => {
    const contexts = [
      { selector: 'pay*', dataSecrecyLifetimeYears: 1 },
      { selector: 'payments-gate*', dataSecrecyLifetimeYears: 7 },
    ];
    expect(resolveContext(asset(), contexts)!.dataSecrecyLifetimeYears).toBe(7);
  });

  it('returns null rather than a nearest guess when nothing matches', () => {
    expect(resolveContext(asset(), [{ selector: 'something-else' }])).toBeNull();
  });
});
