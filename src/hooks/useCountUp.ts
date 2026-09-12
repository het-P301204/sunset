import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/* ============================================================================
   A counting numeral.

   Used only on the readiness figures, where the count communicates that the
   number was computed rather than written down. Everywhere else a number
   simply appears, because animating every digit in an analytical interface is
   noise that costs the reader time.

   Under reduced motion the final value is set immediately: there is no
   degraded shorter animation, because a shorter animation is still animation.
   ========================================================================= */

export function useCountUp(target: number, durationMs = 700, delayMs = 0): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const frame = useRef<number>();

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let cancelled = false;

    const step = (now: number) => {
      if (cancelled) return;
      if (start === null) start = now;
      const elapsed = now - start - delayMs;
      if (elapsed < 0) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(1, elapsed / durationMs);
      // Exponential ease-out, matching --ease-out in the token file.
      const eased = 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * (t === 1 ? 1 : eased)));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs, delayMs, reduced]);

  return value;
}
