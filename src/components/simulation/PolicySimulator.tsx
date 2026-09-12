import { useEffect, useMemo, useState } from 'react';
import type {
  AgilityGrade,
  EnforcementOutcome,
  Finding,
  PolicySpec,
  Severity,
  SimulationResult,
  ThreatClass,
  UnknownHandling,
} from '@/types/domain';
import { AGILITY_ORDER, SEVERITY_ORDER } from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';
import { OUTCOME_LABEL, POLICY_PRESETS, simulate } from '@/engine/simulate';
import { SEVERITY_LABEL } from '@/components/shared/Hatch';
import { Button, SectionHead, Select } from '@/components/shared/Primitives';
import { useCountUp } from '@/hooks/useCountUp';

/* ============================================================================
   ENFORCEMENT SIMULATION

   Nothing here enforces anything, and the interface says so in a place the eye
   cannot skip. What it answers is the question that actually stops a policy
   from shipping: how many working things would this break on the day it is
   turned on, and how many can it not even evaluate?

   The fourth counter is the one that matters. A policy engine has to decide
   what to do with an asset it cannot assess, and every option is wrong in a
   different way. Making the operator choose the handling explicitly, and
   counting the result separately, is the honest version of this screen.
   ========================================================================= */

const THREAT_CLASSES: ThreatClass[] = ['key-establishment', 'signature', 'symmetric', 'hash'];
const FAMILIES = ['RSA', 'ECDSA', 'ECDH', 'DH', 'X25519', 'Ed', 'AES', 'SHA'];

export function PolicySimulator({
  findings,
  policy,
  onPolicyChange,
  onInspect,
}: {
  findings: Finding[];
  policy: PolicySpec;
  onPolicyChange: (policy: PolicySpec) => void;
  onInspect: (outcome: EnforcementOutcome, result: SimulationResult) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const result = useMemo(() => simulate(findings, policy), [findings, policy]);

  // Turning the policy off returns every counter to zero rather than freezing
  // the last run on screen, so "enabled" always means what it says.
  useEffect(() => {
    setEnabled(false);
  }, [policy.id]);

  const patch = (next: Partial<PolicySpec>) =>
    onPolicyChange({ ...policy, ...next, id: `${policy.id}-edited` });

  return (
    <div className="grid gap-0 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      {/* --- policy ------------------------------------------------------- */}
      <div className="border-b border-rule p-4 xl:border-b-0 xl:border-r">
        <SectionHead title="POLICY" meta="not enforced" />

        <div className="mt-3 space-y-3">
          <Select
            label="Preset"
            value={POLICY_PRESETS.find((p) => policy.id.startsWith(p.id))?.id ?? ''}
            onChange={(e) => {
              const preset = POLICY_PRESETS.find((p) => p.id === e.target.value);
              if (preset) onPolicyChange(preset);
            }}
          >
            {POLICY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
            {policy.id.endsWith('-edited') ? <option value="">Edited</option> : null}
          </Select>

          <Group label="THREAT CLASS" hint="Empty means every class is in scope.">
            {THREAT_CLASSES.map((threatClass) => (
              <Pill
                key={threatClass}
                active={policy.threatClasses.includes(threatClass)}
                onClick={() =>
                  patch({ threatClasses: toggle(policy.threatClasses, threatClass) })
                }
              >
                {threatClass.replace('-', ' ')}
              </Pill>
            ))}
          </Group>

          <Group label="ALGORITHM FAMILY" hint="Empty means every family.">
            {FAMILIES.map((family) => (
              <Pill
                key={family}
                active={policy.algorithmFamilies.includes(family)}
                onClick={() =>
                  patch({ algorithmFamilies: toggle(policy.algorithmFamilies, family) })
                }
              >
                {family}
              </Pill>
            ))}
          </Group>

          <Select
            label="Severity threshold"
            value={policy.severityThreshold}
            onChange={(e) => patch({ severityThreshold: e.target.value as Severity })}
            hint="Findings at or above this severity are blocked."
          >
            {SEVERITY_ORDER.filter((s) => s !== 'unknown').map((severity) => (
              <option key={severity} value={severity}>
                {SEVERITY_LABEL[severity]}
              </option>
            ))}
          </Select>

          <Select
            label="Deadline horizon"
            value={policy.deadlineOnOrBefore === null ? 'any' : String(policy.deadlineOnOrBefore)}
            onChange={(e) =>
              patch({
                deadlineOnOrBefore: e.target.value === 'any' ? null : Number(e.target.value),
              })
            }
            hint="Only findings governed by a deadline on or before this year."
          >
            <option value="any">Any deadline</option>
            {[2030, 2031, 2035].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>

          <Select
            label="Minimum agility"
            value={policy.requireAgilityAtLeast ?? 'none'}
            onChange={(e) =>
              patch({
                requireAgilityAtLeast:
                  e.target.value === 'none' ? null : (e.target.value as AgilityGrade),
              })
            }
            hint="Anything harder to change than this is blocked."
          >
            <option value="none">Not checked</option>
            {AGILITY_ORDER.map((grade) => (
              <option key={grade} value={grade}>
                {AGILITY_LABEL[grade]}
              </option>
            ))}
          </Select>

          <Select
            label="Unknown handling"
            value={policy.unknownHandling}
            onChange={(e) => patch({ unknownHandling: e.target.value as UnknownHandling })}
            hint="What a real policy engine would do with an asset it cannot evaluate."
          >
            <option value="block">Block — safest, breaks working systems</option>
            <option value="warn">Warn — visible, not enforced</option>
            <option value="allow">Allow — counted separately, never silently passed</option>
          </Select>
        </div>
      </div>

      {/* --- outcome ------------------------------------------------------- */}
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="border border-amber-dim bg-amber-wash px-1.5 py-0.5 t-data text-2xs uppercase tracking-[0.14em] text-amber">
              Simulation
            </span>
            <span className="text-sm text-ink-muted">
              {enabled
                ? 'Showing what this policy would do to the loaded inventory.'
                : 'Nothing is evaluated until you enable the preview.'}
            </span>
          </div>
          <Button
            variant={enabled ? 'default' : 'primary'}
            onClick={() => setEnabled((v) => !v)}
            aria-pressed={enabled}
          >
            {enabled ? 'Disable preview' : 'Enable policy preview'}
          </Button>
        </div>

        <div className="grid grid-cols-2 border-b border-rule lg:grid-cols-4">
          <Counter
            label="BLOCKED"
            value={enabled ? result.blocked : 0}
            tone="var(--c-critical)"
            note="would be refused on the day this is turned on"
            onClick={() => enabled && onInspect('blocked', result)}
            delay={0}
          />
          <Counter
            label="WARNED"
            value={enabled ? result.warned : 0}
            tone="var(--c-medium)"
            note="in scope, below the threshold"
            onClick={() => enabled && onInspect('warned', result)}
            delay={80}
          />
          <Counter
            label="ALLOWED"
            value={enabled ? result.allowed : 0}
            tone="var(--c-safe)"
            note="outside the policy, or already compliant"
            onClick={() => enabled && onInspect('allowed', result)}
            delay={160}
          />
          <Counter
            label="UNKNOWN"
            value={enabled ? result.unevaluable : 0}
            tone="var(--c-unknown)"
            note="cannot be evaluated by this policy at all"
            onClick={() => enabled && onInspect('unevaluable', result)}
            delay={240}
          />
        </div>

        <OutcomeBar result={result} enabled={enabled} />

        <div className="border-t border-rule px-4 py-3">
          <h3 className="t-label mb-2">ENFORCEMENT PREVIEW</h3>
          {enabled ? (
            <p className="text-md leading-[22px] text-ink-dim measure">
              Before enabling: <strong className="text-risk-critical">{result.blocked}</strong>{' '}
              assets would be blocked,{' '}
              <strong className="text-ink">{result.warned}</strong> would require review, and{' '}
              <strong className="text-risk-unknown">{result.unevaluable}</strong> cannot be
              evaluated at all &mdash; under {policy.unknownHandling.toUpperCase()} handling a real
              engine would{' '}
              {policy.unknownHandling === 'block'
                ? 'refuse those too'
                : policy.unknownHandling === 'warn'
                  ? 'warn and let them through'
                  : 'pass them silently'}
              . SUNSET does not enforce this policy; it reports what the policy would decide about
              the inventory currently loaded.
            </p>
          ) : (
            <p className="text-md leading-[22px] text-ink-muted measure">
              Configure the policy on the left, then enable the preview. The counters stay at zero
              until you do, so a number on this screen always corresponds to a policy you asked
              to evaluate.
            </p>
          )}
        </div>

        {enabled ? (
          <BlockedList result={result} findings={findings} onInspect={onInspect} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The first thing anyone asks after seeing "17 blocked" is which seventeen.
 * Answering it inline beats making them open a dialogue to find out, and it
 * fills the space the counters leave behind with the only content that belongs
 * there.
 */
function BlockedList({
  result,
  findings,
  onInspect,
}: {
  result: SimulationResult;
  findings: Finding[];
  onInspect: (outcome: EnforcementOutcome, result: SimulationResult) => void;
}) {
  const index = new Map(findings.map((f) => [f.id, f]));
  const blocked = result.decisions
    .filter((d) => d.outcome === 'blocked')
    .map((d) => ({ decision: d, finding: index.get(d.findingId)! }))
    .filter((r) => r.finding)
    .sort((a, b) => (b.finding.urgencyScore ?? 0) - (a.finding.urgencyScore ?? 0));

  if (blocked.length === 0) {
    return (
      <div className="border-t border-rule px-4 py-4">
        <p className="text-sm text-ink-muted measure">
          Nothing in this inventory would be blocked by the policy as configured. Lower the
          severity threshold or widen the scope to see where it starts to bite.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-rule">
      <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
        <h3 className="t-label">WHAT WOULD BE BLOCKED</h3>
        <button
          type="button"
          onClick={() => onInspect('blocked', result)}
          className="text-xs text-ink-muted underline decoration-rule-strong underline-offset-2 transition-colors duration-fast hover:text-ink-dim"
        >
          All {blocked.length} with reasons
        </button>
      </div>
      <ul className="divide-y divide-rule-faint border-t border-rule-faint">
        {blocked.slice(0, 10).map(({ decision, finding }) => (
          <li
            key={decision.findingId}
            className="grid grid-cols-[minmax(0,1fr)_7rem] items-baseline gap-3 px-4 py-1.5 sm:grid-cols-[minmax(0,14rem)_7rem_minmax(0,1fr)]"
          >
            <span className="truncate text-sm text-ink">{finding.asset.name}</span>
            <span className="t-data text-xs text-ink-dim">{finding.asset.algorithm}</span>
            <span className="col-span-2 truncate text-xs text-ink-muted sm:col-span-1">
              {decision.reason}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
  note,
  onClick,
  delay,
}: {
  label: string;
  value: number;
  tone: string;
  note: string;
  onClick: () => void;
  delay: number;
}) {
  const counted = useCountUp(value, 520, delay);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={value === 0}
      className="flex flex-col items-start gap-1 border-r border-rule-faint px-4 py-4 text-left transition-colors duration-fast ease-out last:border-r-0 hover:bg-bed-1 disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className="t-label" style={{ color: tone }}>
        {label}
      </span>
      <span
        className="t-data text-[clamp(2rem,3.6vw,3.25rem)] font-light leading-none"
        style={{ color: value === 0 ? 'var(--c-ink-faint)' : tone }}
      >
        {counted}
      </span>
      <span className="text-xs leading-[15px] text-ink-muted">{note}</span>
    </button>
  );
}

/** One bar, four intervals, to scale. The width is the argument. */
function OutcomeBar({ result, enabled }: { result: SimulationResult; enabled: boolean }) {
  const total = Math.max(
    1,
    result.blocked + result.warned + result.allowed + result.unevaluable,
  );
  const segments: { key: EnforcementOutcome; count: number; fill: string; stroke: string }[] = [
    { key: 'blocked', count: result.blocked, fill: 'url(#hx-critical)', stroke: 'var(--c-critical)' },
    { key: 'warned', count: result.warned, fill: 'url(#hx-medium)', stroke: 'var(--c-medium)' },
    { key: 'allowed', count: result.allowed, fill: 'url(#hx-safe)', stroke: 'var(--c-safe)' },
    {
      key: 'unevaluable',
      count: result.unevaluable,
      fill: 'url(#hx-unknown)',
      stroke: 'var(--c-unknown)',
    },
  ];

  return (
    <div className="px-4 py-4">
      <div className="flex h-7 w-full overflow-hidden border border-rule">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="h-full border-r border-rule transition-[width] duration-slow ease-out last:border-r-0"
            style={{ width: enabled ? `${(segment.count / total) * 100}%` : '0%' }}
            title={`${OUTCOME_LABEL[segment.key]}: ${segment.count}`}
          >
            <svg width="100%" height="100%" className="block" aria-hidden="true">
              <rect width="100%" height="100%" fill={segment.fill} />
            </svg>
          </div>
        ))}
        {!enabled ? (
          <div className="flex h-full flex-1 items-center px-2">
            <span className="t-data text-2xs text-ink-faint">policy not evaluated</span>
          </div>
        ) : null}
      </div>
      {enabled ? (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {segments.map((segment) => (
            <span key={segment.key} className="flex items-baseline gap-1.5">
              <span className="t-data text-xs" style={{ color: segment.stroke }}>
                {((segment.count / total) * 100).toFixed(0)}%
              </span>
              <span className="t-label text-[9px]" style={{ color: segment.stroke }}>
                {OUTCOME_LABEL[segment.key]}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="t-label">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1">{children}</div>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </fieldset>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-5 rounded-control border px-1.5 text-2xs uppercase tracking-[0.06em] transition-colors duration-fast ease-out ${
        active
          ? 'border-amber-dim bg-amber-wash text-amber'
          : 'border-rule text-ink-muted hover:border-rule-strong hover:text-ink-dim'
      }`}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
