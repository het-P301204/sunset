import type {
  AssetContext,
  CoverageGap,
  CryptoAsset,
  QuantumImpact,
  ThreatClass,
} from '@/types/domain';
import { recognize, type Recognition } from './algorithms';

/* ============================================================================
   Classification: what is this cryptographic use, and what does a CRQC do to it?

   The hard case is a family like RSA that can be either key establishment or a
   signature. The classifier looks at four sources of evidence in order and, if
   none of them answer, refuses to pick. An RSA use of unknown purpose is
   genuinely unclassifiable, and guessing would put it under the wrong deadline.
   ========================================================================= */

export interface Classification {
  threatClass: ThreatClass;
  quantumImpact: QuantumImpact;
  hndl: boolean;
  recognition: Recognition;
  gaps: CoverageGap[];
  /** Human-readable basis for the threat class, shown in the evidence chain. */
  basis: string;
}

const KEY_ESTABLISHMENT_FUNCTIONS = new Set([
  'encapsulate',
  'decapsulate',
  'keygen',
  'key-agree',
  'keyagree',
  'key-derive',
  'encrypt',
  'decrypt',
]);

const SIGNATURE_FUNCTIONS = new Set(['sign', 'verify', 'digest-sign', 'digest-verify']);

const KEY_ESTABLISHMENT_PRIMITIVES = new Set(['kem', 'pke', 'key-agree', 'ke', 'drbg']);
const SIGNATURE_PRIMITIVES = new Set(['signature']);

export function classify(asset: CryptoAsset, context: AssetContext | null): Classification {
  const gaps: CoverageGap[] = [];
  const recognition = recognize(asset.rawAlgorithm, {
    keySizeBits: asset.keySizeBits,
    curve: asset.curve,
  });
  const profile = recognition.profile;

  if (!profile) {
    gaps.push({
      reason: 'unrecognized-algorithm',
      field: 'algorithm',
      detail: `"${asset.rawAlgorithm}" does not match any algorithm family SUNSET recognizes, so no threat class or deadline can be assigned.`,
      blocking: true,
    });
    return {
      threatClass: 'unclassified',
      quantumImpact: 'unknown',
      hndl: false,
      recognition,
      gaps,
      basis: 'Algorithm string not recognized.',
    };
  }

  let threatClass: ThreatClass | null = profile.defaultThreatClass;
  let basis = threatClass
    ? `${profile.family} is only used for ${labelOf(threatClass)}.`
    : '';

  if (!threatClass) {
    const primitive = (asset.primitive ?? '').toLowerCase();
    const fns = (asset.functions ?? []).map((f) => f.toLowerCase());

    if (SIGNATURE_PRIMITIVES.has(primitive)) {
      threatClass = 'signature';
      basis = `Inventory declares primitive "${asset.primitive}".`;
    } else if (KEY_ESTABLISHMENT_PRIMITIVES.has(primitive)) {
      threatClass = 'key-establishment';
      basis = `Inventory declares primitive "${asset.primitive}".`;
    } else if (fns.some((f) => SIGNATURE_FUNCTIONS.has(f))) {
      threatClass = 'signature';
      basis = `Inventory declares cryptographic function "${fns.find((f) => SIGNATURE_FUNCTIONS.has(f))}".`;
    } else if (fns.some((f) => KEY_ESTABLISHMENT_FUNCTIONS.has(f))) {
      threatClass = 'key-establishment';
      basis = `Inventory declares cryptographic function "${fns.find((f) => KEY_ESTABLISHMENT_FUNCTIONS.has(f))}".`;
    } else if (asset.certificate?.signatureAlgorithm) {
      threatClass = 'signature';
      basis = 'Use appears as a certificate signature algorithm.';
    } else if (asset.source.kind === 'certificate') {
      threatClass = 'signature';
      basis = 'Use was discovered on a certificate.';
    } else {
      gaps.push({
        reason: 'unsupported-evidence',
        field: 'cryptoProperties.primitive',
        detail: `${profile.family} is used for both key establishment and signatures. The inventory records neither a primitive nor a cryptographic function, so the governing deadline cannot be resolved.`,
        blocking: true,
      });
      return {
        threatClass: 'unclassified',
        quantumImpact: profile.quantumImpact,
        hndl: false,
        recognition,
        gaps,
        basis: `${profile.family} purpose not declared by the inventory.`,
      };
    }
  }

  const quantumImpact = profile.quantumImpact;

  // Harvest-now-decrypt-later applies when recorded traffic becomes readable
  // later. That is key establishment broken by Shor, unless the operator has
  // stated the channel is not exposed to capture.
  let hndl = threatClass === 'key-establishment' && quantumImpact === 'broken';
  if (context?.hndlExposed === false) hndl = false;
  if (context?.hndlExposed === true && quantumImpact === 'broken') hndl = true;

  if (
    profile.minClassicalBits !== undefined &&
    recognition.keySizeBits === null &&
    profile.class === 'asymmetric'
  ) {
    gaps.push({
      reason: 'missing-key-size',
      field: 'cryptoProperties.algorithmProperties.parameterSetIdentifier',
      detail: `No key size or curve recorded for ${profile.family}. Classical strength cannot be checked, though the post-quantum verdict is unaffected.`,
      blocking: false,
    });
  }

  return { threatClass, quantumImpact, hndl, recognition, gaps, basis };
}

export function labelOf(threatClass: ThreatClass): string {
  switch (threatClass) {
    case 'key-establishment':
      return 'key establishment';
    case 'signature':
      return 'signatures';
    case 'symmetric':
      return 'symmetric encryption';
    case 'hash':
      return 'hashing';
    default:
      return 'an unclassified purpose';
  }
}
