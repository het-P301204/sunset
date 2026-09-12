import { FIXTURES } from '@/fixtures';
import { Button } from '@/components/shared/Primitives';
import { SEVERITY_LABEL, SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';
import type { Severity } from '@/types/domain';
import type { ViewId } from '@/state/views';

/* ============================================================================
   THE EMPTY STATE, WHICH IS ALSO THE ENTRY

   With no inventory loaded there is nothing to analyse, so this screen does
   the two things it usefully can: say what file to go and find, and teach the
   notation before the reader meets it under pressure.

   It draws no chart. A resting time axis here was a picture of a timeline with
   nothing on it — decoration standing in for the real one, which is a click
   away at 400 and only means anything once an inventory exists. What replaces
   it is the part of the product a reader cannot guess: that the third input is
   human judgement, and that severity is carried by pattern rather than colour.
   ========================================================================= */

interface InputFormat {
  name: string;
  gives: string;
  note: string;
  human?: boolean;
}

const INPUTS: InputFormat[] = [
  {
    name: 'CycloneDX 1.6 CBOM',
    gives: 'what cryptography exists',
    note: 'Algorithms, certificates and protocol suites, as a scanner found them.',
  },
  {
    name: 'Repository crypto scan',
    gives: 'where it is called from',
    note: 'Call sites with file and line, for an estate the CBOM does not cover.',
  },
  {
    name: 'SUNSET context file',
    gives: 'data lifetime and migration effort',
    note: 'The two inputs no scanner can collect. Without them most findings come back UNKNOWN, and that is the correct answer rather than a failure.',
    human: true,
  },
];

const NOTATION: { severity: Severity; meaning: string }[] = [
  { severity: 'critical', meaning: 'broken primitive, window already gone' },
  { severity: 'high', meaning: 'broken, window reachable but tight' },
  { severity: 'medium', meaning: 'in scope, slack in the schedule' },
  { severity: 'low', meaning: 'exposed, not on a binding path' },
  { severity: 'safe', meaning: 'post-quantum, or no migration indicated' },
  { severity: 'unknown', meaning: 'not scored — an input was absent' },
];

export function Landing({
  onNavigate,
  onLoadFixture,
}: {
  onNavigate: (view: ViewId) => void;
  onLoadFixture: (id: string) => void;
}) {
  return (
    <div className="relative min-h-full px-5 py-12 lg:px-12 lg:py-16">
      <div
        className="ground-grid pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-5xl">
        <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-light leading-[0.94] tracking-[-0.03em] text-ink">
          SUNSET
        </h1>
        <p className="mt-3 t-data text-xs uppercase tracking-[0.24em] text-amber">
          Cryptographic migration triage
        </p>
        <p className="mt-6 max-w-[54ch] text-lg leading-[26px] text-ink-dim">
          Your cryptographic inventory is not a migration plan. SUNSET turns one into a
          deadline-anchored, risk-ranked sequence &mdash; and states plainly what it could not
          assess.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => onNavigate('import')}>
            Analyse an inventory
          </Button>
          <Button onClick={() => onLoadFixture(FIXTURES[0]!.id)}>Load the sample estate</Button>
          <span className="t-data text-3xs text-ink-faint">
            offline &middot; no credentials &middot; nothing leaves this page
          </span>
        </div>

        <div className="mt-14 grid gap-10 border-t border-rule pt-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-14">
          {/* --- what to go and find ---------------------------------------- */}
          <section aria-labelledby="reads-head">
            <h2 id="reads-head" className="t-label">
              WHAT IT READS
            </h2>
            <ol className="mt-3 divide-y divide-rule-faint border-y border-rule-faint">
              {INPUTS.map((input, i) => (
                <li key={input.name} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 py-3">
                  <span className="t-data pt-0.5 text-xs text-ink-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="t-data text-sm text-ink">{input.name}</span>
                      <span
                        className="t-data text-3xs uppercase tracking-[0.08em]"
                        style={{ color: input.human ? 'var(--c-amber)' : 'var(--c-ink-muted)' }}
                      >
                        {input.human ? 'supplied by a person' : 'produced by a tool'}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-dim">{input.gives}</span>
                    <span className="mt-1 block text-xs leading-[16px] text-ink-muted">
                      {input.note}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-[16px] text-ink-faint measure">
              Any one of the three is enough to start. The samples below carry all three, and one
              carries only the first &mdash; load that one to see what a discovery tool on its own
              can actually tell you.
            </p>
          </section>

          {/* --- how to read the output ------------------------------------- */}
          <section aria-labelledby="notation-head">
            <h2 id="notation-head" className="t-label">
              THE NOTATION
            </h2>
            <p className="mt-3 text-xs leading-[16px] text-ink-muted">
              Severity is carried by hatch pattern before colour, so the ranking survives a
              grayscale print and does not depend on telling red from orange.
            </p>
            <dl className="mt-3 divide-y divide-rule-faint border-y border-rule-faint">
              {NOTATION.map(({ severity, meaning }) => (
                <div key={severity} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 py-2">
                  <dt className="flex items-center gap-2">
                    <SeverityMark severity={severity} size={12} />
                    <span
                      className="t-data text-3xs uppercase tracking-[0.08em]"
                      style={{ color: SEVERITY_VAR[severity] }}
                    >
                      {SEVERITY_LABEL[severity]}
                    </span>
                  </dt>
                  <dd className="text-xs leading-[16px] text-ink-dim">{meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-x-10 gap-y-5 border-t border-rule pt-6 sm:grid-cols-3">
          {[
            [
              'DEADLINE-ANCHORED',
              'Every finding is tied to a published obligation, quoted and cited: EO 14412 and NIST IR 8547.',
            ],
            [
              'MOSCA-RANKED',
              'Migration time plus data-secrecy lifetime against an assumed CRQC year — an assumption the interface never hides.',
            ],
            [
              'HONEST ABOUT GAPS',
              'The inputs no scanner can collect are reported as UNKNOWN with the missing field named, never defaulted.',
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <dt className="t-label">{title}</dt>
              <dd className="mt-1.5 text-sm leading-[18px] text-ink-muted">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
