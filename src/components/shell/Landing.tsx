import { useEffect, useState } from 'react';
import { TIMELINE_END, TIMELINE_START, DEADLINES } from '@/engine/deadlines';
import { FIXTURES } from '@/fixtures';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/shared/Primitives';
import type { ViewId } from '@/state/views';

/* ============================================================================
   THE EMPTY STATE, WHICH IS ALSO THE ENTRY

   With no inventory loaded there is nothing to analyse, so this screen does
   the one thing it can: state what the product does, show the column it
   measures against, and offer the only two useful actions.

   The background column is live — it is the same year scale and the same
   marker horizons the timeline uses, drawn at rest. It is not an illustration
   of a timeline; it is the timeline with nothing plotted on it, which is
   exactly the state the application is in.
   ========================================================================= */

export function Landing({
  onNavigate,
  onLoadFixture,
}: {
  onNavigate: (view: ViewId) => void;
  onLoadFixture: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const [lit, setLit] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(() => setLit(true), 120);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  const years: number[] = [];
  for (let y = TIMELINE_START; y <= TIMELINE_END; y += 1) years.push(y);

  return (
    <div className="relative flex min-h-full flex-col justify-center overflow-hidden px-5 py-14 lg:px-12">
      <div className="ground-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-4xl">
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
          <span className="t-data text-2xs text-ink-faint">
            offline &middot; no credentials &middot; nothing leaves this page
          </span>
        </div>

        {/* --- the resting column ------------------------------------------ */}
        <div className="relative mt-14 h-[86px] w-full" aria-hidden="true">
          <div
            className="absolute left-0 top-[22px] h-px bg-rule-strong transition-[width] duration-[900ms] ease-out"
            style={{ width: lit ? '100%' : '0%' }}
          />
          {years.map((year, i) => {
            const x = ((year - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
            const deadline = DEADLINES.find((d) => d.year === year && d.effect !== 'deprecated');
            const major = !!deadline && deadline.effect !== 'milestone';
            return (
              <div
                key={year}
                className="absolute top-0 transition-opacity duration-slow ease-out"
                style={{
                  left: `${x}%`,
                  opacity: lit ? 1 : 0,
                  transitionDelay: `${300 + i * 55}ms`,
                }}
              >
                <span
                  className="block w-px"
                  style={{
                    height: major ? 46 : 22,
                    marginTop: major ? 0 : 12,
                    background: major ? 'var(--c-amber)' : 'var(--c-rule-strong)',
                  }}
                />
                {/* The final horizon sits on the right edge of the column, so
                    its year and label read back into the plot. */}
                <span
                  className={`absolute top-[52px] t-data text-[10px] tracking-[0.1em] ${
                    major ? 'text-amber' : 'text-ink-faint'
                  } ${year === TIMELINE_END ? 'right-0 text-right' : 'left-0'}`}
                >
                  {year}
                </span>
                {major ? (
                  <span
                    className={`absolute top-[66px] w-24 t-data text-3xs uppercase leading-tight tracking-[0.1em] text-ink-muted ${
                      year === TIMELINE_END ? 'right-0 text-right' : 'left-0'
                    }`}
                  >
                    {deadline!.label}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <dl className="mt-16 grid grid-cols-1 gap-x-10 gap-y-5 border-t border-rule pt-6 sm:grid-cols-3">
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
