import { AGILITY_ORDER, type AgilityGrade, type Severity } from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';
import { SEVERITY_LABEL, SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';
import { Modal } from '@/components/shared/Overlays';

/* ============================================================================
   The legend.

   A map that uses a symbol language ships the key with it. Every hatch, mark
   and grade this interface draws is defined here, and the panel is reachable
   from anywhere with "?" or the command palette.

   It is a ranked table, not a scatter of chips: the severities are in order,
   the agility grades are in order, and the order itself is information.
   ========================================================================= */

const SEVERITY_MEANING: Record<Severity, string> = {
  critical:
    'Score 70 or above. A primitive a CRQC breaks, with an insufficient or tight migration window.',
  high: 'Score 50 to 69. Broken primitive with a reachable but non-trivial window.',
  medium: 'Score 30 to 49. In scope for migration, with slack in the schedule.',
  low: 'Score 12 to 29. Exposed but not on a binding path.',
  safe: 'Score under 12, or a FIPS 203/204/205 algorithm. No migration indicated.',
  unknown:
    'Not scored. A required input was absent, so no severity was assigned. This is not a low severity.',
};

const AGILITY_MEANING: Record<AgilityGrade, string> = {
  negotiated: 'Endpoints negotiate the algorithm. Replacement is a configuration change.',
  configuration: 'Selected by configuration or policy. Replacement is a controlled change.',
  hardcoded: 'Compiled in. Replacement needs a code change and a release.',
  'vendor-controlled': 'Chosen by a third party. Replacement is not in this estate’s control.',
  unknown: 'Not established. The effort figure carries no difficulty weighting.',
};

export function Legend({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="LEGEND" width="max-w-2xl">
      <div className="space-y-5">
        <section>
          <h3 className="t-label mb-2">SEVERITY</h3>
          <p className="mb-2.5 text-sm text-ink-muted measure">
            Carried by hatch pattern first and colour second, so the ranking survives a
            grayscale print and does not depend on distinguishing red from orange.
          </p>
          <dl className="divide-y divide-rule-faint border-y border-rule-faint">
            {(Object.keys(SEVERITY_LABEL) as Severity[]).map((severity) => (
              <div key={severity} className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5">
                <dt className="flex items-center gap-2">
                  <SeverityMark severity={severity} size={11} />
                  <span
                    className="t-data text-2xs uppercase tracking-[0.1em]"
                    style={{ color: SEVERITY_VAR[severity] }}
                  >
                    {SEVERITY_LABEL[severity]}
                  </span>
                </dt>
                <dd className="text-sm text-ink-dim">{SEVERITY_MEANING[severity]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="t-label mb-2">CRYPTO-AGILITY</h3>
          <dl className="divide-y divide-rule-faint border-y border-rule-faint">
            {[...AGILITY_ORDER, 'unknown' as AgilityGrade].map((grade, index) => (
              <div key={grade} className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5">
                <dt className="flex items-center gap-2">
                  <span className="t-data w-3 text-2xs text-ink-faint">
                    {grade === 'unknown' ? '—' : index + 1}
                  </span>
                  <span className="t-data text-2xs uppercase tracking-[0.08em] text-ink-dim">
                    {AGILITY_LABEL[grade]}
                  </span>
                </dt>
                <dd className="text-sm text-ink-dim">{AGILITY_MEANING[grade]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="t-label mb-2">MARKS</h3>
          <dl className="divide-y divide-rule-faint border-y border-rule-faint">
            <MarkRow
              mark={
                <svg width="28" height="11" viewBox="0 0 28 11" aria-hidden="true">
                  <line x1="0" y1="5.5" x2="28" y2="5.5" stroke="var(--c-amber)" strokeWidth="1.5" />
                </svg>
              }
              label="MARKER HORIZON"
              meaning="A published deadline, ruled across every finding on the timeline. Amber is used for nothing else."
            />
            <MarkRow
              mark={
                <svg width="28" height="11" viewBox="0 0 28 11" aria-hidden="true">
                  <rect width="28" height="11" fill="url(#hx-unknown)" />
                  <rect
                    width="27"
                    height="10"
                    x="0.5"
                    y="0.5"
                    fill="none"
                    stroke="var(--c-unknown)"
                    strokeDasharray="2 2"
                  />
                </svg>
              }
              label="NO RECOVERY"
              meaning="An interval the engine could not assess. Drawn to scale and never omitted: no finding does not mean no risk."
            />
            <MarkRow
              mark={
                <svg width="28" height="11" viewBox="0 0 28 11" aria-hidden="true">
                  <rect y="3" width="28" height="5" fill="var(--c-ink-faint)" opacity="0.35" />
                  <rect y="3" width="17" height="5" fill="var(--c-amber)" />
                </svg>
              }
              label="RECOVERY BAR"
              meaning="Proportion of an interval that was assessable, the way a core log records recovery percentage."
            />
            <MarkRow
              mark={
                <span className="t-data text-2xs text-risk-critical">OVR</span>
              }
              label="OPERATOR OVERRIDE"
              meaning="A position the operator moved. The engine's recommendation is kept and shown alongside it, never replaced."
            />
          </dl>
        </section>

        <section>
          <h3 className="t-label mb-2">KEYS</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {[
              ['G then O / I / R / T', 'Go to a view'],
              ['Ctrl or Cmd + K', 'Command palette'],
              ['/', 'Search the inventory'],
              ['J / K', 'Next / previous finding'],
              ['?', 'This legend'],
              ['Esc', 'Close the panel'],
            ].map(([key, meaning]) => (
              <div key={key} className="flex items-baseline gap-2">
                <kbd className="t-data shrink-0 text-2xs text-ink-dim">{key}</kbd>
                <span className="text-xs text-ink-muted">{meaning}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function MarkRow({
  mark,
  label,
  meaning,
}: {
  mark: React.ReactNode;
  label: string;
  meaning: string;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5">
      <dt className="flex items-center gap-2">
        {mark}
        <span className="t-data text-2xs uppercase tracking-[0.08em] text-ink-dim">{label}</span>
      </dt>
      <dd className="text-sm text-ink-dim">{meaning}</dd>
    </div>
  );
}
