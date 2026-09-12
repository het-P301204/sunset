import type {
  AgilityAssessment,
  AgilityGrade,
  AssetContext,
  CoverageGap,
  CryptoAsset,
} from '@/types/domain';
import { AGILITY_ORDER } from '@/types/domain';

/* ============================================================================
   Crypto-agility.

   How hard the algorithm is to replace decides how much of the migration
   window the work actually consumes. A negotiated cipher suite is a config
   push; a key baked into a hardware module is a procurement cycle.

   The operator supplies this where they know it. Where they do not, the engine
   will infer a grade from the protocol only when the protocol genuinely
   determines it, and records that the value was inferred rather than stated.
   ========================================================================= */

const NEGOTIATED_PROTOCOLS = [/^TLSV?1\.[23]/, /^TLS1[23]/, /^QUIC/, /^SSHV?2/, /^IKEV2/];
const CONFIGURED_PROTOCOLS = [/^TLSV?1\.[01]/, /^IPSEC/, /^SMTP/, /^LDAPS/];

export interface AgilityOutcome {
  assessment: AgilityAssessment;
  gaps: CoverageGap[];
}

export function assessAgility(
  asset: CryptoAsset,
  context: AssetContext | null,
): AgilityOutcome {
  const gaps: CoverageGap[] = [];

  if (context?.agility && context.agility !== 'unknown') {
    return {
      assessment: {
        grade: context.agility,
        position: positionOf(context.agility),
        basis: 'context',
        note: noteFor(context.agility),
      },
      gaps,
    };
  }

  const protocol = (asset.protocol ?? '').toUpperCase().replace(/[^A-Z0-9.]/g, '');
  if (protocol) {
    if (NEGOTIATED_PROTOCOLS.some((p) => p.test(protocol))) {
      return {
        assessment: {
          grade: 'negotiated',
          position: positionOf('negotiated'),
          basis: 'protocol-inference',
          note: `${asset.protocol} negotiates its algorithms, so replacement is a configuration change on both ends rather than a code change. Inferred from the protocol, not stated by the operator.`,
        },
        gaps,
      };
    }
    if (CONFIGURED_PROTOCOLS.some((p) => p.test(protocol))) {
      return {
        assessment: {
          grade: 'configuration',
          position: positionOf('configuration'),
          basis: 'protocol-inference',
          note: `${asset.protocol} selects algorithms by configuration. Inferred from the protocol, not stated by the operator.`,
        },
        gaps,
      };
    }
  }

  gaps.push({
    reason: 'missing-agility',
    field: 'agility',
    detail:
      'No agility grade supplied and the protocol does not determine one. Remediation friction cannot be estimated, so the migration effort figure carries no difficulty weighting.',
    blocking: false,
  });

  return {
    assessment: {
      grade: 'unknown',
      position: null,
      basis: 'unknown',
      note: 'Replacement difficulty has not been established for this use.',
    },
    gaps,
  };
}

export function positionOf(grade: AgilityGrade): number | null {
  const i = AGILITY_ORDER.indexOf(grade);
  return i === -1 ? null : i;
}

export function noteFor(grade: AgilityGrade): string {
  switch (grade) {
    case 'negotiated':
      return 'Replaced by negotiation between endpoints. Low remediation friction.';
    case 'configuration':
      return 'Replaced by a configuration or policy change. Moderate remediation friction.';
    case 'hardcoded':
      return 'Replaced only by changing and shipping code. High remediation friction.';
    case 'vendor-controlled':
      return 'Not replaceable by this organisation. Remediation depends on a third party.';
    default:
      return 'Replacement difficulty has not been established for this use.';
  }
}

export const AGILITY_LABEL: Record<AgilityGrade, string> = {
  negotiated: 'NEGOTIATED',
  configuration: 'CONFIGURATION',
  hardcoded: 'HARD-CODED',
  'vendor-controlled': 'VENDOR CONTROLLED',
  unknown: 'UNKNOWN',
};

/** Multiplier applied to the urgency score. Harder to change means more urgent. */
export function agilityWeight(grade: AgilityGrade): number {
  switch (grade) {
    case 'negotiated':
      return 0.88;
    case 'configuration':
      return 1.0;
    case 'hardcoded':
      return 1.12;
    case 'vendor-controlled':
      return 1.2;
    default:
      return 1.0;
  }
}
