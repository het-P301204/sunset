import type { QuantumImpact, ThreatClass } from '@/types/domain';

/* ============================================================================
   Algorithm recognition.

   Inventories spell algorithms a dozen ways: "RSA-2048", "rsaEncryption",
   "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256", "id-ecPublicKey". This table
   normalizes what it recognizes and — importantly — refuses to guess at what
   it does not. An unrecognized string produces an 'unclassified' finding with
   an `unrecognized-algorithm` gap, never a silent default.
   ========================================================================= */

export type AlgorithmClass = 'asymmetric' | 'symmetric' | 'hash' | 'kdf';

export interface AlgorithmProfile {
  family: string;
  class: AlgorithmClass;
  quantumImpact: QuantumImpact;
  /**
   * The threat class when the inventory does not say what the algorithm is
   * used for. Null where the family is genuinely ambiguous (RSA), which forces
   * the classifier to look at the primitive or cryptographic functions.
   */
  defaultThreatClass: ThreatClass | null;
  /** Classical security below this bit count is independently weak. */
  minClassicalBits?: number;
  /**
   * True where the primitive is already broken by classical cryptanalysis.
   * These need removing regardless of any quantum consideration, and saying so
   * matters: an operator should not read SHA-1 in this queue and conclude the
   * problem is a future machine.
   */
  classicallyBroken?: boolean;
  /** The FIPS 203/204/205 replacement, where one exists. */
  replacement?: string;
  note: string;
}

interface Matcher {
  /** Tested against the uppercased, punctuation-stripped algorithm string. */
  test: RegExp;
  family: string;
}

export const PROFILES: Record<string, AlgorithmProfile> = {
  RSA: {
    family: 'RSA',
    class: 'asymmetric',
    quantumImpact: 'broken',
    defaultThreatClass: null,
    minClassicalBits: 2048,
    replacement: 'ML-KEM-768 for key establishment, ML-DSA-65 for signatures',
    note: "Shor's algorithm recovers the private key from the public modulus.",
  },
  ECDSA: {
    family: 'ECDSA',
    class: 'asymmetric',
    quantumImpact: 'broken',
    defaultThreatClass: 'signature',
    minClassicalBits: 256,
    replacement: 'ML-DSA-65 (FIPS 204) or SLH-DSA (FIPS 205)',
    note: "Shor's algorithm solves the elliptic-curve discrete log.",
  },
  ECDH: {
    family: 'ECDH',
    class: 'asymmetric',
    quantumImpact: 'broken',
    defaultThreatClass: 'key-establishment',
    minClassicalBits: 256,
    replacement: 'ML-KEM-768 (FIPS 203), hybrid with X25519 during transition',
    note: 'Recorded handshakes are decryptable once a CRQC exists.',
  },
  DH: {
    family: 'DH',
    class: 'asymmetric',
    quantumImpact: 'broken',
    defaultThreatClass: 'key-establishment',
    minClassicalBits: 2048,
    replacement: 'ML-KEM-768 (FIPS 203)',
    note: 'Finite-field Diffie-Hellman falls to the same discrete-log attack.',
  },
  DSA: {
    family: 'DSA',
    class: 'asymmetric',
    quantumImpact: 'broken',
    defaultThreatClass: 'signature',
    minClassicalBits: 2048,
    replacement: 'ML-DSA-65 (FIPS 204)',
    note: 'Finite-field discrete log; already discouraged classically.',
  },
  EDDSA: {
    family: 'EdDSA',
    class: 'asymmetric',
    quantumImpact: 'broken',
    defaultThreatClass: 'signature',
    minClassicalBits: 256,
    replacement: 'ML-DSA-65 (FIPS 204)',
    note: 'Edwards-curve signatures fall to the same discrete-log attack.',
  },
  X25519: {
    family: 'X25519',
    class: 'asymmetric',
    quantumImpact: 'broken',
    defaultThreatClass: 'key-establishment',
    minClassicalBits: 256,
    replacement: 'ML-KEM-768, or X25519MLKEM768 as a hybrid',
    note: 'Montgomery-curve key agreement; classical security only.',
  },
  'ML-KEM': {
    family: 'ML-KEM',
    class: 'asymmetric',
    quantumImpact: 'resistant',
    defaultThreatClass: 'key-establishment',
    note: 'FIPS 203, published 13 August 2024.',
  },
  'ML-DSA': {
    family: 'ML-DSA',
    class: 'asymmetric',
    quantumImpact: 'resistant',
    defaultThreatClass: 'signature',
    note: 'FIPS 204, published 13 August 2024.',
  },
  'SLH-DSA': {
    family: 'SLH-DSA',
    class: 'asymmetric',
    quantumImpact: 'resistant',
    defaultThreatClass: 'signature',
    note: 'FIPS 205, published 13 August 2024. Hash-based, conservative.',
  },
  AES: {
    family: 'AES',
    class: 'symmetric',
    quantumImpact: 'weakened',
    defaultThreatClass: 'symmetric',
    minClassicalBits: 128,
    note: "Grover's algorithm halves the effective key strength; AES-256 retains a 128-bit margin.",
  },
  CHACHA20: {
    family: 'ChaCha20',
    class: 'symmetric',
    quantumImpact: 'weakened',
    defaultThreatClass: 'symmetric',
    minClassicalBits: 256,
    note: 'Stream cipher at 256-bit key; Grover leaves a 128-bit margin.',
  },
  '3DES': {
    family: '3DES',
    class: 'symmetric',
    quantumImpact: 'weakened',
    defaultThreatClass: 'symmetric',
    minClassicalBits: 168,
    classicallyBroken: true,
    note: 'Classically weak before any quantum consideration; 64-bit block.',
  },
  RC4: {
    family: 'RC4',
    class: 'symmetric',
    quantumImpact: 'weakened',
    defaultThreatClass: 'symmetric',
    minClassicalBits: 128,
    classicallyBroken: true,
    note: 'Classically broken. Quantum capability is not the reason to remove it.',
  },
  SHA2: {
    family: 'SHA-2',
    class: 'hash',
    quantumImpact: 'weakened',
    defaultThreatClass: 'hash',
    minClassicalBits: 256,
    note: 'Grover reduces preimage resistance; SHA-256 retains a 128-bit margin.',
  },
  SHA3: {
    family: 'SHA-3',
    class: 'hash',
    quantumImpact: 'weakened',
    defaultThreatClass: 'hash',
    minClassicalBits: 256,
    note: 'Sponge construction; same Grover margin as SHA-2 at equal output.',
  },
  SHA1: {
    family: 'SHA-1',
    class: 'hash',
    quantumImpact: 'weakened',
    defaultThreatClass: 'hash',
    minClassicalBits: 160,
    classicallyBroken: true,
    note: 'Classically broken for collision resistance since 2017.',
  },
  MD5: {
    family: 'MD5',
    class: 'hash',
    quantumImpact: 'weakened',
    defaultThreatClass: 'hash',
    minClassicalBits: 128,
    classicallyBroken: true,
    note: 'Classically broken. Quantum capability is not the reason to remove it.',
  },
  HKDF: {
    family: 'HKDF',
    class: 'kdf',
    quantumImpact: 'weakened',
    defaultThreatClass: 'symmetric',
    note: 'Security follows the underlying hash.',
  },
  PBKDF2: {
    family: 'PBKDF2',
    class: 'kdf',
    quantumImpact: 'weakened',
    defaultThreatClass: 'symmetric',
    note: 'Security follows the underlying hash and iteration count.',
  },
};

/** Order matters: the first match wins, so specific patterns precede general ones. */
const MATCHERS: Matcher[] = [
  { test: /^(ML[-_]?KEM|KYBER)/, family: 'ML-KEM' },
  { test: /^(ML[-_]?DSA|DILITHIUM)/, family: 'ML-DSA' },
  { test: /^(SLH[-_]?DSA|SPHINCS)/, family: 'SLH-DSA' },
  { test: /^(X25519|X448|CURVE25519)/, family: 'X25519' },
  { test: /^(ED25519|ED448|EDDSA)/, family: 'EDDSA' },
  { test: /ECDSA|ECDSAWITH|IDECPUBLICKEY|SECP\d/, family: 'ECDSA' },
  { test: /ECDHE?|ECMQV/, family: 'ECDH' },
  { test: /^RSA|RSAENCRYPTION|RSASSA|RSAES|SHA\d*WITHRSA/, family: 'RSA' },
  { test: /^DSA|DSAWITH/, family: 'DSA' },
  { test: /^(DH|DHE|DIFFIEHELLMAN|MODP)/, family: 'DH' },
  { test: /3DES|TRIPLEDES|DESEDE/, family: '3DES' },
  { test: /^AES/, family: 'AES' },
  { test: /CHACHA20/, family: 'CHACHA20' },
  { test: /^RC4|ARCFOUR/, family: 'RC4' },
  { test: /^SHA3|SHAKE/, family: 'SHA3' },
  { test: /^SHA1$|^SHA$|SHA1WITH/, family: 'SHA1' },
  { test: /^SHA(224|256|384|512)/, family: 'SHA2' },
  { test: /^MD5/, family: 'MD5' },
  { test: /^HKDF/, family: 'HKDF' },
  { test: /^PBKDF2/, family: 'PBKDF2' },
];

export interface Recognition {
  profile: AlgorithmProfile | null;
  /** Canonical display name, e.g. "RSA-2048" or "ECDSA-P256". */
  canonical: string;
  keySizeBits: number | null;
  curve: string | null;
}

const CURVE_BITS: Record<string, number> = {
  P192: 192,
  P224: 224,
  P256: 256,
  P384: 384,
  P521: 521,
  SECP256R1: 256,
  SECP384R1: 384,
  SECP521R1: 521,
  SECP256K1: 256,
  PRIME256V1: 256,
  BRAINPOOLP256R1: 256,
  BRAINPOOLP384R1: 384,
  X25519: 255,
  X448: 448,
  ED25519: 255,
  ED448: 448,
};

function normalizeCurve(raw: string): string | null {
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (key in CURVE_BITS) {
    if (/^SECP256R1|PRIME256V1$/.test(key)) return 'P-256';
    if (key === 'SECP384R1') return 'P-384';
    if (key === 'SECP521R1') return 'P-521';
    if (/^P\d+$/.test(key)) return `P-${key.slice(1)}`;
    return raw.toUpperCase();
  }
  return null;
}

/**
 * Recognize an algorithm string. Returns `profile: null` when nothing matched,
 * which the classifier turns into an explicit coverage gap.
 */
export function recognize(
  raw: string,
  hints: { keySizeBits?: number; curve?: string } = {},
): Recognition {
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const matcher = MATCHERS.find((m) => m.test.test(key));
  const profile = matcher ? PROFILES[matcher.family]! : null;

  // Key size: explicit hint first, then digits embedded in the string.
  let keySizeBits: number | null = hints.keySizeBits ?? null;
  let curve: string | null = hints.curve ? normalizeCurve(hints.curve) : null;

  if (!curve) {
    const curveMatch = key.match(/(SECP\d{3}[RK]1|PRIME256V1|BRAINPOOLP\d{3}R1|P(192|224|256|384|521))/);
    if (curveMatch) curve = normalizeCurve(curveMatch[0]);
  }
  if (keySizeBits === null && curve) {
    const bits = CURVE_BITS[curve.replace(/[^A-Z0-9]/g, '')];
    if (bits) keySizeBits = bits;
  }
  if (keySizeBits === null) {
    const sizeMatch = raw.match(/(?:^|[^0-9])(512|1024|2048|3072|4096|7680|8192|128|192|256|384|521|448|768|1024)(?:$|[^0-9])/);
    if (sizeMatch && profile && profile.family !== 'SHA-2' && profile.family !== 'SHA-3') {
      keySizeBits = Number(sizeMatch[1]);
    }
  }

  let canonical: string;
  if (!profile) {
    canonical = raw.trim();
  } else if (profile.family === 'X25519') {
    canonical = /448/.test(key) ? 'X448' : 'X25519';
  } else if (profile.family === 'EdDSA') {
    canonical = /448/.test(key) ? 'Ed448' : 'Ed25519';
  } else if (profile.family === 'SHA-2' || profile.family === 'SHA-3') {
    const out = raw.match(/(224|256|384|512)/);
    canonical = out ? `${profile.family === 'SHA-2' ? 'SHA' : 'SHA3'}-${out[1]}` : profile.family;
  } else if (profile.family === 'SHA-1' || profile.family === 'MD5' || profile.family === 'RC4') {
    canonical = profile.family;
  } else if (curve && (profile.family === 'ECDSA' || profile.family === 'ECDH')) {
    canonical = `${profile.family}-${curve.replace('-', '')}`;
  } else if (profile.family === 'ML-KEM' || profile.family === 'ML-DSA') {
    const param = raw.match(/(512|768|1024|44|65|87)/);
    canonical = param ? `${profile.family}-${param[1]}` : profile.family;
  } else if (keySizeBits) {
    canonical = `${profile.family}-${keySizeBits}`;
  } else {
    canonical = profile.family;
  }

  return { profile, canonical, keySizeBits, curve };
}
