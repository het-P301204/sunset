import type {
  EnforcementDecision,
  Finding,
  PolicySpec,
  SimulationResult,
} from '@/types/domain';
import { AGILITY_ORDER, SEVERITY_ORDER } from '@/types/domain';

/* ============================================================================
   Enforcement simulation.

   SUNSET enforces nothing. This function answers one question: if the policy
   below were turned on today, what would happen to the assets in this
   inventory?

   The fourth outcome is the point. A real policy engine has to decide what to
   do with an asset it cannot evaluate, and every choice is wrong in a
   different way: block and you break working systems, allow and the policy is
   theatre. So `unevaluable` is counted separately and the operator picks the
   handling explicitly.
   ========================================================================= */

export const DEFAULT_POLICY: PolicySpec = {
  id: 'no-new-quantum-vulnerable-ke',
  name: 'No new quantum-vulnerable key establishment',
  threatClasses: ['key-establishment'],
  algorithmFamilies: [],
  severityThreshold: 'medium',
  deadlineOnOrBefore: 2030,
  requireAgilityAtLeast: null,
  unknownHandling: 'warn',
};

export const POLICY_PRESETS: PolicySpec[] = [
  DEFAULT_POLICY,
  {
    id: 'eo-14412-signatures',
    name: 'EO 14412 signature obligation',
    threatClasses: ['signature'],
    algorithmFamilies: [],
    severityThreshold: 'medium',
    deadlineOnOrBefore: 2031,
    requireAgilityAtLeast: null,
    unknownHandling: 'warn',
  },
  {
    id: 'no-hardcoded-legacy',
    name: 'No hard-coded classical asymmetric crypto',
    threatClasses: ['key-establishment', 'signature'],
    algorithmFamilies: ['RSA', 'ECDSA', 'ECDH', 'DH', 'Ed'],
    severityThreshold: 'low',
    deadlineOnOrBefore: null,
    requireAgilityAtLeast: 'configuration',
    unknownHandling: 'block',
  },
  {
    id: 'ir-8547-2035',
    name: 'NIST IR 8547 disallowed-after-2035 readiness',
    threatClasses: [],
    algorithmFamilies: ['RSA', 'ECDSA', 'ECDH', 'DH'],
    severityThreshold: 'safe',
    deadlineOnOrBefore: 2035,
    requireAgilityAtLeast: null,
    unknownHandling: 'allow',
  },
];

export function simulate(findings: Finding[], policy: PolicySpec): SimulationResult {
  const decisions: EnforcementDecision[] = findings.map((finding) =>
    decide(finding, policy),
  );

  const count = (outcome: EnforcementDecision['outcome']) =>
    decisions.filter((d) => d.outcome === outcome).length;

  return {
    policy,
    decisions,
    blocked: count('blocked'),
    warned: count('warned'),
    allowed: count('allowed'),
    unevaluable: count('unevaluable'),
  };
}

function decide(finding: Finding, policy: PolicySpec): EnforcementDecision {
  const id = finding.id;

  // Scope first. Out-of-scope assets are allowed because the policy does not
  // speak to them, which is a different statement from "this asset is fine".
  //
  // But scope can only be decided on a finding whose class is known. A use the
  // engine could not classify is not out of scope; it is a use nobody can place
  // inside or outside the scope, and calling it ALLOWED would launder an
  // unknown into a pass. Same for an unrecognized algorithm against a
  // family-scoped policy.
  if (policy.threatClasses.length > 0) {
    if (finding.threatClass === 'unclassified') {
      return {
        findingId: id,
        outcome: 'unevaluable',
        reason:
          'The inventory does not say what this algorithm is used for, so the policy cannot decide whether it is in scope.',
      };
    }
    if (!policy.threatClasses.includes(finding.threatClass)) {
      return {
        findingId: id,
        outcome: 'allowed',
        reason: `Threat class ${finding.threatClass} is outside the policy scope.`,
      };
    }
  }

  if (policy.algorithmFamilies.length > 0) {
    if (finding.quantumImpact === 'unknown') {
      return {
        findingId: id,
        outcome: 'unevaluable',
        reason: `"${finding.asset.rawAlgorithm}" was not recognized, so it cannot be matched against the policy’s algorithm families.`,
      };
    }
    const matches = policy.algorithmFamilies.some((family) =>
      finding.asset.algorithm.toUpperCase().startsWith(family.toUpperCase()),
    );
    if (!matches) {
      return {
        findingId: id,
        outcome: 'allowed',
        reason: `${finding.asset.algorithm} is not in the policy’s algorithm families.`,
      };
    }
  }

  if (policy.deadlineOnOrBefore !== null) {
    const year = finding.anchor?.deadline.year ?? null;
    if (year === null) {
      // In scope by class but governed by no deadline: the deadline clause
      // cannot be applied, so it does not decide the outcome on its own.
    } else if (year > policy.deadlineOnOrBefore) {
      return {
        findingId: id,
        outcome: 'allowed',
        reason: `Governing deadline ${year} is after the policy horizon ${policy.deadlineOnOrBefore}.`,
      };
    }
  }

  // Anything that could not be scored is counted as unevaluable, whatever the
  // policy would do about it. Folding these into `blocked` or `warned` would
  // make the fourth counter read zero under the common handlings, and the
  // fourth counter is the one this screen exists to show. The handling is
  // reported in the reason instead: what a real engine WOULD do, stated, while
  // the tally keeps saying what is actually knowable.
  if (finding.urgencyScore === null) {
    const handling = policy.unknownHandling;
    const field = finding.gaps.find((g) => g.blocking)?.field ?? 'a required input';
    const consequence =
      handling === 'block'
        ? 'a real engine configured this way would refuse it'
        : handling === 'warn'
          ? 'a real engine configured this way would warn and let it through'
          : 'a real engine configured this way would pass it silently';
    return {
      findingId: id,
      outcome: 'unevaluable',
      reason: `Cannot be evaluated: ${field} is missing. Unknown handling is ${handling.toUpperCase()}, so ${consequence}.`,
    };
  }

  if (policy.requireAgilityAtLeast) {
    const required = AGILITY_ORDER.indexOf(policy.requireAgilityAtLeast);
    const actual = finding.agility.position;
    if (actual === null) {
      return {
        findingId: id,
        outcome: 'unevaluable',
        reason:
          'Agility grade is unknown, so the agility requirement cannot be checked against this asset.',
      };
    }
    if (actual > required) {
      return {
        findingId: id,
        outcome: 'blocked',
        reason: `Agility ${finding.agility.grade} is harder to change than the required ${policy.requireAgilityAtLeast}.`,
      };
    }
  }

  const threshold = SEVERITY_ORDER.indexOf(policy.severityThreshold);
  const actual = SEVERITY_ORDER.indexOf(finding.severity);

  if (finding.severity === 'safe' || finding.quantumImpact === 'resistant') {
    return {
      findingId: id,
      outcome: 'allowed',
      reason:
        finding.quantumImpact === 'resistant'
          ? `${finding.asset.algorithm} is quantum-resistant.`
          : 'Severity is below any enforcement threshold.',
    };
  }

  if (actual <= threshold) {
    return {
      findingId: id,
      outcome: 'blocked',
      reason: `Severity ${finding.severity.toUpperCase()} is at or above the ${policy.severityThreshold.toUpperCase()} threshold.`,
    };
  }

  return {
    findingId: id,
    outcome: 'warned',
    reason: `In scope but below the ${policy.severityThreshold.toUpperCase()} threshold.`,
  };
}

export const OUTCOME_LABEL = {
  blocked: 'BLOCKED',
  warned: 'WARNED',
  allowed: 'ALLOWED',
  unevaluable: 'UNKNOWN',
} as const;
