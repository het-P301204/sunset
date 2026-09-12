import type { CryptoAsset, Inventory, ParseWarning } from '@/types/domain';
import * as s from '../sanitize';

/* ============================================================================
   CycloneDX 1.6 CBOM parser.

   Reads `cryptographic-asset` components and turns each cryptographic USE into
   one asset. Three shapes matter:

     algorithm   -> one asset
     certificate -> one asset for the certificate's signature algorithm
     protocol    -> one asset per algorithm role inside each cipher suite,
                    because a suite is not one migration item: the key
                    exchange, the authentication and the bulk cipher are on
                    different deadlines and are replaced by different work.

   The ARES 2026 survey's complaint about CBOM permissiveness is visible here:
   almost every field is optional in the spec, so almost every branch below has
   a "the document did not say" path. Those paths produce parse warnings and
   coverage gaps rather than assumptions.
   ========================================================================= */

const MAX_COMPONENTS = 20000;

interface Ctx {
  assets: CryptoAsset[];
  warnings: ParseWarning[];
  seen: Set<string>;
  refIndex: Map<string, unknown>;
}

export function parseCycloneDX(doc: unknown, sourceBytes: number, name: string): Inventory {
  const warnings: ParseWarning[] = [];
  const ctx: Ctx = { assets: [], warnings, seen: new Set(), refIndex: new Map() };

  const bomFormat = s.text(s.prop(doc, 'bomFormat'), 40);
  const specVersion = s.text(s.prop(doc, 'specVersion'), 20);

  if (bomFormat !== 'CycloneDX') {
    warnings.push({
      severity: 'error',
      at: '$.bomFormat',
      message: `Expected bomFormat "CycloneDX", found ${bomFormat ? `"${bomFormat}"` : 'nothing'}.`,
    });
  }
  if (specVersion && Number(specVersion) < 1.6) {
    warnings.push({
      severity: 'warning',
      at: '$.specVersion',
      message: `Spec version ${specVersion} predates 1.6; cryptographic-asset components may be absent or shaped differently.`,
    });
  }

  const components = flatten(s.prop(doc, 'components'), ctx, warnings);
  for (const c of components) ctx.refIndex.set(s.text(s.prop(c, 'bom-ref'), 200), c);

  for (const component of components) {
    readComponent(component, ctx);
  }

  if (ctx.assets.length === 0) {
    warnings.push({
      severity: 'error',
      at: '$.components',
      message:
        'No cryptographic-asset components found. SUNSET analyses cryptographic uses; a software BOM without cryptographic assets produces no findings.',
    });
  }

  const metadata = s.prop(doc, 'metadata');
  const producer = readProducer(metadata);

  return {
    id: `inv-${hashString(`${name}:${sourceBytes}:${ctx.assets.length}`)}`,
    name: s.text(name, 120) || 'Imported inventory',
    format: 'cyclonedx-cbom',
    version: specVersion ? `CycloneDX ${specVersion}` : 'CycloneDX (version not declared)',
    generatedAt: s.isoDate(s.prop(metadata, 'timestamp')),
    producer,
    assets: ctx.assets,
    contexts: [],
    synthetic: false,
    parseWarnings: warnings,
    sourceBytes,
  };
}

function flatten(value: unknown, ctx: Ctx, warnings: ParseWarning[]): unknown[] {
  const out: unknown[] = [];
  const walk = (list: unknown, depth: number) => {
    if (!Array.isArray(list) || depth > 12) return;
    for (const item of list) {
      if (out.length >= MAX_COMPONENTS) {
        if (ctx.seen.has('__truncated__')) return;
        ctx.seen.add('__truncated__');
        warnings.push({
          severity: 'warning',
          at: '$.components',
          message: `Component list exceeds ${MAX_COMPONENTS} entries; the remainder was not read.`,
        });
        return;
      }
      out.push(item);
      walk(s.prop(item, 'components'), depth + 1);
    }
  };
  walk(value, 0);
  return out;
}

function readProducer(metadata: unknown): string | null {
  const tools = s.prop(metadata, 'tools');
  const list = Array.isArray(tools) ? tools : (s.prop(tools, 'components') as unknown);
  if (Array.isArray(list) && list.length > 0) {
    const first = list[0];
    const n = s.text(s.prop(first, 'name'), 80);
    const v = s.text(s.prop(first, 'version'), 40);
    if (n) return v ? `${n} ${v}` : n;
  }
  return null;
}

function readComponent(component: unknown, ctx: Ctx): void {
  const type = s.text(s.prop(component, 'type'), 40);
  if (type !== 'cryptographic-asset') return;

  const crypto = s.prop(component, 'cryptoProperties');
  const assetType = s.text(s.prop(crypto, 'assetType'), 40);
  const ref = s.text(s.prop(component, 'bom-ref'), 200) || `component-${ctx.assets.length}`;
  const name = s.text(s.prop(component, 'name'), 160) || ref;

  switch (assetType) {
    case 'algorithm':
      readAlgorithm(component, crypto, ref, name, ctx);
      break;
    case 'certificate':
      readCertificate(component, crypto, ref, name, ctx);
      break;
    case 'protocol':
      readProtocol(component, crypto, ref, name, ctx);
      break;
    case 'related-crypto-material':
      // Key material carries no algorithm decision of its own; it is evidence
      // attached to the algorithm that uses it, not a separate migration item.
      break;
    default:
      ctx.warnings.push({
        severity: 'warning',
        at: `${ref}.cryptoProperties.assetType`,
        message: assetType
          ? `Unsupported cryptographic assetType "${assetType}".`
          : 'Component declares type cryptographic-asset but no assetType.',
      });
  }
}

function readAlgorithm(
  component: unknown,
  crypto: unknown,
  ref: string,
  name: string,
  ctx: Ctx,
): void {
  const algProps = s.prop(crypto, 'algorithmProperties');
  const paramSet = s.text(s.prop(algProps, 'parameterSetIdentifier'), 40);
  const curve = s.text(s.prop(algProps, 'curve'), 40);
  const primitive = s.text(s.prop(algProps, 'primitive'), 40);
  const functions = s.stringArray(s.prop(algProps, 'cryptoFunctions'));
  const classical = s.finiteNumber(s.prop(algProps, 'classicalSecurityLevel'));

  const occurrences = readOccurrences(component);
  const owner = ownerOf(component, occurrences[0]?.location);

  const rawAlgorithm = paramSet && !name.includes(paramSet) ? `${name}-${paramSet}` : name;

  push(ctx, {
    id: ref,
    name: owner,
    algorithm: '',
    rawAlgorithm,
    primitive: primitive || undefined,
    keySizeBits: s.boundedNumber(paramSet, 8, 16384),
    curve: curve || undefined,
    protocol: undefined,
    functions: functions.length ? functions : undefined,
    source: {
      kind: 'cbom-component',
      ref,
      locator: occurrences[0]?.location,
      line: occurrences[0]?.line,
    },
    attributes: {
      ...s.attributes(algProps),
      ...(classical !== undefined ? { classicalSecurityLevel: String(classical) } : {}),
      ...(s.text(s.prop(crypto, 'oid'), 80) ? { oid: s.text(s.prop(crypto, 'oid'), 80) } : {}),
      occurrences: String(occurrences.length),
    },
  });
}

function readCertificate(
  _component: unknown,
  crypto: unknown,
  ref: string,
  name: string,
  ctx: Ctx,
): void {
  const cert = s.prop(crypto, 'certificateProperties');
  const sigAlg = s.text(s.prop(cert, 'signatureAlgorithmRef'), 160);
  const subject = s.text(s.prop(cert, 'subjectName'), 160);
  const issuer = s.text(s.prop(cert, 'issuerName'), 160);
  const notAfter = s.isoDate(s.prop(cert, 'notValidAfter'));

  // The signature algorithm may be a bom-ref pointing at an algorithm
  // component. Resolve it so the finding carries a real algorithm, not a ref.
  const resolved = ctx.refIndex.get(sigAlg);
  const algorithmName = resolved ? s.text(s.prop(resolved, 'name'), 120) : sigAlg;

  if (!algorithmName) {
    ctx.warnings.push({
      severity: 'warning',
      at: `${ref}.certificateProperties.signatureAlgorithmRef`,
      message: `Certificate "${subject || name}" declares no signature algorithm; it cannot be assessed.`,
    });
    return;
  }

  push(ctx, {
    id: `${ref}#signature`,
    name: subject || name,
    algorithm: '',
    rawAlgorithm: algorithmName,
    primitive: 'signature',
    functions: ['sign', 'verify'],
    certificate: {
      subject: subject || undefined,
      issuer: issuer || undefined,
      signatureAlgorithm: algorithmName,
      notAfter: notAfter || undefined,
      serialNumber: s.text(s.prop(cert, 'serialNumber'), 80) || undefined,
    },
    source: { kind: 'certificate', ref },
    attributes: {
      certificateFormat: s.text(s.prop(cert, 'certificateFormat'), 40) || 'not declared',
      ...(notAfter ? { notValidAfter: notAfter.slice(0, 10) } : {}),
    },
  });
}

/** Cipher-suite role decomposition. Each role is its own migration decision. */
function readProtocol(
  component: unknown,
  crypto: unknown,
  ref: string,
  name: string,
  ctx: Ctx,
): void {
  const proto = s.prop(crypto, 'protocolProperties');
  const type = s.text(s.prop(proto, 'type'), 40).toUpperCase();
  const version = s.text(s.prop(proto, 'version'), 20);
  const label = version ? `${type}v${version}` : type || 'PROTOCOL';
  const suites = s.prop(proto, 'cipherSuites');
  const occurrences = readOccurrences(component);
  const owner = ownerOf(component, occurrences[0]?.location) || name;

  if (!Array.isArray(suites) || suites.length === 0) {
    ctx.warnings.push({
      severity: 'warning',
      at: `${ref}.protocolProperties.cipherSuites`,
      message: `${label} on "${owner}" lists no cipher suites, so the algorithms it negotiates are not recorded.`,
    });
    return;
  }

  for (const suite of suites.slice(0, 64)) {
    const suiteName = s.text(s.prop(suite, 'name'), 120);
    if (!suiteName) continue;
    const roles = decomposeSuite(suiteName);
    if (roles.length === 0) {
      ctx.warnings.push({
        severity: 'warning',
        at: `${ref}.cipherSuites`,
        message: `Cipher suite "${suiteName}" does not follow a recognized naming scheme and was not decomposed.`,
      });
      continue;
    }
    for (const role of roles) {
      push(ctx, {
        id: `${ref}#${suiteName}#${role.role}`,
        name: `${owner} / ${role.roleLabel}`,
        algorithm: '',
        rawAlgorithm: role.algorithm,
        primitive: role.primitive,
        functions: role.functions,
        protocol: label,
        source: {
          kind: 'tls-config',
          ref: `${ref}#${suiteName}`,
          locator: occurrences[0]?.location,
          line: occurrences[0]?.line,
        },
        attributes: {
          cipherSuite: suiteName,
          role: role.roleLabel,
          protocol: label,
          ...(s.stringArray(s.prop(suite, 'identifiers'), 4).length
            ? { identifiers: s.stringArray(s.prop(suite, 'identifiers'), 4).join(' ') }
            : {}),
        },
      });
    }
  }
}

interface SuiteRole {
  role: string;
  roleLabel: string;
  algorithm: string;
  primitive: string;
  functions: string[];
}

/**
 * TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
 *     ^kx    ^auth      ^cipher
 * TLS 1.3 suites (TLS_AES_128_GCM_SHA256) name only the bulk cipher; the key
 * exchange and authentication are negotiated separately, so they are not
 * invented here.
 */
export function decomposeSuite(raw: string): SuiteRole[] {
  const name = raw.toUpperCase();
  if (!name.startsWith('TLS_')) return [];
  const body = name.slice(4);
  const roles: SuiteRole[] = [];

  const withIndex = body.indexOf('_WITH_');
  if (withIndex === -1) {
    // TLS 1.3 style: TLS_AES_128_GCM_SHA256 / TLS_CHACHA20_POLY1305_SHA256
    const cipher = body.replace(/_SHA\d+$/, '');
    if (cipher) {
      roles.push({
        role: 'cipher',
        roleLabel: 'bulk cipher',
        algorithm: cipher.replace(/_/g, '-'),
        primitive: 'ae',
        functions: ['encrypt', 'decrypt'],
      });
    }
    return roles;
  }

  const head = body.slice(0, withIndex);
  const tail = body.slice(withIndex + 6);

  const kxMatch = head.match(/^(ECDHE|DHE|ECDH|DH|RSA|PSK|SRP)/);
  if (kxMatch) {
    roles.push({
      role: 'kx',
      roleLabel: 'key establishment',
      algorithm: kxMatch[1]!,
      primitive: 'key-agree',
      functions: ['keygen', 'key-agree'],
    });
  }
  const authMatch = head.match(/_(RSA|ECDSA|DSS|PSK|ANON)$/);
  if (authMatch) {
    roles.push({
      role: 'auth',
      roleLabel: 'authentication',
      algorithm: authMatch[1] === 'DSS' ? 'DSA' : authMatch[1]!,
      primitive: 'signature',
      functions: ['sign', 'verify'],
    });
  }

  const cipher = tail.replace(/_SHA\d*$/, '').replace(/_MD5$/, '');
  if (cipher) {
    roles.push({
      role: 'cipher',
      roleLabel: 'bulk cipher',
      algorithm: cipher.replace(/_/g, '-'),
      primitive: 'block-cipher',
      functions: ['encrypt', 'decrypt'],
    });
  }

  return roles;
}

interface Occurrence {
  location: string | undefined;
  line: number | undefined;
}

function readOccurrences(component: unknown): Occurrence[] {
  const evidence = s.prop(component, 'evidence');
  const list = s.prop(evidence, 'occurrences');
  if (!Array.isArray(list)) return [];
  return list.slice(0, 50).map((o) => ({
    location: s.locator(s.prop(o, 'location')) || undefined,
    line: s.boundedNumber(s.prop(o, 'line'), 1, 10_000_000),
  }));
}

/**
 * The system the crypto belongs to. A CBOM names the algorithm, not the thing
 * that uses it, so this reads the group, the publisher, or the first path
 * segment of an occurrence — and falls back to the component name.
 */
function ownerOf(component: unknown, location: string | undefined): string {
  const group = s.text(s.prop(component, 'group'), 80);
  if (group) return group;
  const publisher = s.text(s.prop(component, 'publisher'), 80);
  if (publisher) return publisher;
  if (location) {
    const head = location.split('/')[0];
    if (head && head.length > 1) return head;
  }
  return s.text(s.prop(component, 'name'), 120) || 'unattributed';
}

function push(ctx: Ctx, asset: Omit<CryptoAsset, 'algorithm'> & { algorithm: string }): void {
  if (ctx.seen.has(asset.id)) return;
  ctx.seen.add(asset.id);
  ctx.assets.push(asset);
}

/** FNV-1a. Small, deterministic, and used only for stable display ids. */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
