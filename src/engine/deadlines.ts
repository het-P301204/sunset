import type { Deadline, ThreatClass } from '@/types/domain';

/* ============================================================================
   The deadline table.

   Everything in this file is a citation to a published instrument. Nothing is
   estimated, rounded, or extended. If a claim is not in one of the cited
   documents it does not belong here, and the interface must not imply an
   obligation that no instrument creates.

   Symmetric and hash primitives deliberately have no entry: neither EO 14412
   nor NIST IR 8547 sets a post-quantum migration date for them. The engine
   anchors those findings to no deadline and says so, which is more useful than
   inventing one.
   ========================================================================= */

export const DEADLINES: Deadline[] = [
  {
    id: 'cbom-minimum-elements',
    year: 2027,
    date: '2027-03-19',
    label: 'CBOM MINIMUM ELEMENTS',
    authority: 'EO-14412',
    clause:
      'CISA and NIST to publish minimum elements for a cryptographic bill of materials within 270 days of the order.',
    citation:
      'Executive Order 14412, Securing the Nation Against Advanced Cryptographic Attacks (22 June 2026)',
    appliesTo: [],
    effect: 'milestone',
  },
  {
    id: 'eo-14412-key-establishment',
    year: 2030,
    date: '2030-12-31',
    label: 'KEY ESTABLISHMENT',
    authority: 'EO-14412',
    clause:
      'Post-quantum key establishment required for high-value assets and high-impact systems by 31 December 2030.',
    citation:
      'Executive Order 14412, Securing the Nation Against Advanced Cryptographic Attacks (22 June 2026)',
    appliesTo: ['key-establishment'],
    effect: 'mandated',
  },
  {
    id: 'nist-ir-8547-deprecated',
    year: 2030,
    date: '2030-12-31',
    label: 'CLASSICAL ASYMMETRIC DEPRECATED',
    authority: 'NIST-IR-8547',
    clause:
      'RSA, ECDSA, ECDH and DH at 112-bit classical security are deprecated after 2030.',
    citation: 'NIST IR 8547, Transition to Post-Quantum Cryptography Standards',
    appliesTo: ['key-establishment', 'signature'],
    effect: 'deprecated',
  },
  {
    id: 'eo-14412-signatures',
    year: 2031,
    date: '2031-12-31',
    label: 'SIGNATURES',
    authority: 'EO-14412',
    clause:
      'Post-quantum digital signatures required for high-value assets and high-impact systems by 31 December 2031.',
    citation:
      'Executive Order 14412, Securing the Nation Against Advanced Cryptographic Attacks (22 June 2026)',
    appliesTo: ['signature'],
    effect: 'mandated',
  },
  {
    id: 'nist-ir-8547-disallowed',
    year: 2035,
    date: '2035-12-31',
    label: 'LEGACY CRYPTO DISALLOWED',
    authority: 'NIST-IR-8547',
    clause: 'RSA, ECDSA, ECDH and DH are disallowed after 2035.',
    citation: 'NIST IR 8547, Transition to Post-Quantum Cryptography Standards',
    appliesTo: ['key-establishment', 'signature'],
    effect: 'disallowed',
  },
];

/** The span the SUNSET timeline draws. Both ends are chosen, not derived. */
export const TIMELINE_START = 2026;
export const TIMELINE_END = 2035;

/**
 * The deadline that governs a finding: the earliest binding obligation that
 * applies to its threat class. Milestones never govern a finding — they are
 * timeline context, not an obligation on an asset.
 */
export function governingDeadline(threatClass: ThreatClass): Deadline | null {
  const applicable = DEADLINES.filter(
    (d) => d.effect !== 'milestone' && d.appliesTo.includes(threatClass),
  );
  if (applicable.length === 0) return null;
  // Effect outranks year. A mandate is a hard date someone is accountable for;
  // a deprecation still permits use under risk acceptance. Anchoring a
  // signature to the 2030 deprecation instead of the 2031 mandate would report
  // an obligation that does not exist, and would put the whole signature
  // population on the wrong marker horizon.
  const rank = (e: Deadline['effect']) => (e === 'mandated' ? 0 : e === 'disallowed' ? 1 : 2);
  return applicable.sort((a, b) => {
    const effectDelta = rank(a.effect) - rank(b.effect);
    if (effectDelta !== 0) return effectDelta;
    return a.year - b.year;
  })[0]!;
}

export function deadlineById(id: string): Deadline | undefined {
  return DEADLINES.find((d) => d.id === id);
}
