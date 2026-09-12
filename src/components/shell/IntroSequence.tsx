import { useEffect, useState } from 'react';
import { TIMELINE_END, TIMELINE_START } from '@/engine/deadlines';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/* ============================================================================
   Entry sequence.

   1.4 seconds, once per session, skippable by any key or click, and skipped
   entirely under reduced motion. It draws the one thing the whole product is
   about: a rule across time, with the deadline years struck onto it.

   Every colour here comes from the same tokens the rest of the product uses,
   so the sequence opens on buff paper under the light theme rather than on a
   black rectangle the operator never asked for. index.html resolves the theme
   before first paint, so the tokens are already correct when this mounts.

   It is not a splash screen with a logo animation. If the operator learns
   nothing from it, it should not exist.
   ========================================================================= */

const TOTAL_MS = 1400;

export function IntroSequence({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const leave = window.setTimeout(() => setLeaving(true), TOTAL_MS);
    const done = window.setTimeout(onDone, TOTAL_MS + 260);
    const skip = () => {
      setLeaving(true);
      window.setTimeout(onDone, 160);
    };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone, reduced]);

  if (reduced) return null;

  const years = [TIMELINE_START, 2028, 2030, 2031, TIMELINE_END];

  return (
    <div
      className="fixed inset-0 z-intro flex items-center justify-center bg-ground transition-opacity duration-base ease-out"
      style={{ opacity: leaving ? 0 : 1 }}
      role="presentation"
    >
      <div className="w-full max-w-2xl px-8">
        <div className="relative h-px w-full overflow-hidden">
          <span
            className="absolute left-1/2 top-0 h-px bg-rule-strong"
            style={{ animation: 'intro-rule 520ms var(--ease-out) both' }}
          />
        </div>

        <div className="relative mt-6 overflow-hidden">
          <h1
            className="text-center text-4xl font-medium tracking-[0.22em] text-ink"
            style={{ animation: 'intro-word 560ms var(--ease-out) 260ms both' }}
          >
            SUNSET
          </h1>
        </div>

        <p
          className="mt-3 text-center t-data text-2xs uppercase tracking-[0.3em] text-ink-muted"
          style={{ animation: 'intro-fade 400ms var(--ease-out) 520ms both' }}
        >
          Cryptographic posture &middot; migration triage
        </p>

        <div
          className="relative mx-auto mt-10 h-6 w-full max-w-lg"
          style={{ animation: 'intro-fade 420ms var(--ease-out) 720ms both' }}
        >
          <div className="absolute left-0 top-3 h-px w-full bg-rule" />
          {years.map((year, i) => {
            const x = ((year - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
            const marker = year === 2030 || year === 2031;
            return (
              <div
                key={year}
                className="absolute top-0"
                style={{
                  left: `${x}%`,
                  animation: `intro-tick 300ms var(--ease-out) ${780 + i * 70}ms both`,
                }}
              >
                <span
                  className="block h-6 w-px"
                  style={{ background: marker ? 'var(--c-amber)' : 'var(--c-rule-strong)' }}
                />
                <span
                  className="absolute left-1/2 top-7 -translate-x-1/2 t-data text-3xs tracking-[0.1em]"
                  style={{ color: marker ? 'var(--c-amber)' : 'var(--c-ink-faint)' }}
                >
                  {year}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes intro-rule {
          from { width: 0; transform: translateX(0); }
          to   { width: 100%; transform: translateX(-50%); }
        }
        @keyframes intro-word {
          from { opacity: 0; transform: translateY(10px); clip-path: inset(0 0 100% 0); }
          to   { opacity: 1; transform: none; clip-path: inset(0 0 0 0); }
        }
        @keyframes intro-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes intro-tick { from { opacity: 0; transform: scaleY(0.2); transform-origin: top } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  );
}
